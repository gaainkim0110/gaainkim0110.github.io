import * as XLSX from 'xlsx';
import type { Employee, OrgNode } from '@/types';
import { REQUIRED_COLUMNS } from '@/types';

export interface ParseResult {
  success: boolean;
  employees?: Employee[];
  rootNodes?: OrgNode[];
  errors?: string[];
}

// 엑셀 파일 파싱
export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 첫 번째 시트 가져오기
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: ''
    });

    if (jsonData.length === 0) {
      return { success: false, errors: ['엑셀 파일에 데이터가 없습니다.'] };
    }

    // 컬럼 검증
    const headers = Object.keys(jsonData[0]);
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      return {
        success: false,
        errors: [`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`]
      };
    }

    // 직원 데이터 파싱
    const employees: Employee[] = [];
    const errors: string[] = [];

    jsonData.forEach((row, index) => {
      try {
        const employee = parseEmployeeRow(row, index + 2); // 2부터 시작 (헤더 제외)
        employees.push(employee);
      } catch (error) {
        errors.push(`행 ${index + 2}: ${error instanceof Error ? error.message : '파싱 오류'}`);
      }
    });

    if (errors.length > 0 && employees.length === 0) {
      return { success: false, errors };
    }

    // NAVER 직원만 필터링
    const naverEmployees = employees.filter(emp => emp.levels.level2 === 'NAVER');

    // 조직도 트리 구조 생성
    const rootNodes = buildOrgTree(naverEmployees);

    return {
      success: true,
      employees: naverEmployees,
      rootNodes,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    return {
      success: false,
      errors: [`파일 읽기 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`]
    };
  }
}

// 행 데이터를 Employee로 변환
function parseEmployeeRow(row: Record<string, unknown>, rowNum: number): Employee {
  const getValue = (key: string): string => {
    const value = row[key];
    return value !== undefined && value !== null ? String(value).trim() : '';
  };

  const name = getValue('성명');
  const employeeId = getValue('사번');

  if (!name || !employeeId) {
    throw new Error('성명 또는 사번이 비어있습니다.');
  }

  const isLeaderValue = getValue('조직장 여부');
  const relationValue = getValue('사원관계');

  return {
    no: Number(getValue('No')) || rowNum - 1,
    name,
    employeeId,
    department: getValue('부서'),
    orgCode: getValue('조직코드'),
    position: getValue('직책'),
    relation: (relationValue === '겸직' ? '겸직' : '원소속') as '원소속' | '겸직',
    isLeader: isLeaderValue === 'Y' || isLeaderValue === 'y',
    employmentType: getValue('고용형태'),
    levels: {
      level1: getValue('레벨1') || '이사회',
      level2: getValue('레벨2'),
      level3: getValue('레벨3') || undefined,
      level4: getValue('레벨4') || undefined,
      level5: getValue('레벨5') || undefined,
      level6: getValue('레벨6') || undefined,
      level7: getValue('레벨7') || undefined,
      level8: getValue('레벨8') || undefined,
    },
  };
}

// 직원 목록에서 조직도 트리 구조 생성
export function buildOrgTree(employees: Employee[]): OrgNode[] {
  // 조직 맵 생성 (레벨별 조직 구조)
  const orgMap = new Map<string, OrgNode>();

  // 각 직원을 순회하며 조직 구조 구축 (이미 NAVER 필터링된 직원들)
  employees.forEach(emp => {
    const levels = emp.levels;
    let parentId: string | undefined = undefined;

    // 레벨2부터 8까지 순회 (레벨1 이사회는 표시하지 않음, 레벨3은 레벨2 겸직이므로 스킵)
    for (let i = 2; i <= 8; i++) {
      // 레벨3은 스킵 (레벨2의 겸직)
      if (i === 3) continue;

      const levelKey = `level${i}` as keyof typeof levels;
      const levelValue = levels[levelKey];

      if (!levelValue) continue; // 값이 없으면 다음 레벨로

      // 조직 ID 생성 (상위 레벨들을 조합하여 고유 ID 생성, 레벨3 제외)
      const orgPath = Array.from({ length: i - 1 }, (_, idx) => {
        const key = `level${idx + 2}` as keyof typeof levels;
        // 레벨3은 제외
        if (idx + 2 === 3) return '';
        return levels[key] || '';
      }).filter(Boolean).join('_');

      const orgId = `org_${orgPath}_${levelValue}`.replace(/\s+/g, '_');

      if (!orgMap.has(orgId)) {
        // 실제 표시 레벨 계산 (레벨3 스킵으로 인해 조정: 2→2, 4→3, 5→4, ...)
        const displayLevel = i === 2 ? 2 : i - 1;

        const newNode: OrgNode = {
          id: orgId,
          name: levelValue,
          level: displayLevel,
          memberCount: 0,
          concurrentCount: 0,
          members: [],
          children: [],
          isExpanded: displayLevel <= 3, // 레벨 3까지는 기본 펼침
          parentId,
        };
        orgMap.set(orgId, newNode);

        // 부모 노드에 자식으로 추가
        if (parentId) {
          const parent = orgMap.get(parentId);
          if (parent && !parent.children.find(c => c.id === orgId)) {
            parent.children.push(newNode);
          }
        }
      }

      parentId = orgId;
    }

    // 최종 소속 조직에 직원 추가
    if (parentId) {
      const finalOrg = orgMap.get(parentId);
      if (finalOrg) {
        finalOrg.members.push(emp);

        // 외주직은 인원수에서 제외 (조직장 이름은 표시됨)
        if (emp.employmentType !== '외주직') {
          finalOrg.memberCount++;

          if (emp.relation === '겸직') {
            finalOrg.concurrentCount++;
          }
        }

        // 조직장 설정 (외주직이어도 조직장 이름은 표시)
        // LEVEL3에만 값이 있는 경우 (LEVEL4 이상 없음)는 LEVEL2의 조직장이 아님
        // (LEVEL3는 LEVEL2의 겸직이므로)
        const hasLevel3Only = emp.levels.level3 &&
          !emp.levels.level4 && !emp.levels.level5 &&
          !emp.levels.level6 && !emp.levels.level7 && !emp.levels.level8;

        if (emp.isLeader && !hasLevel3Only) {
          finalOrg.leader = {
            name: emp.name,
            isExecutive: emp.employmentType === '임원',
            isConcurrent: emp.relation === '겸직',
          };
        }
      }
    }
  });

  // 루트 노드들 (레벨2 = NAVER) 반환
  const rootNodes = Array.from(orgMap.values()).filter(node => node.level === 2);

  // Helper: 노드와 모든 하위 노드에서 직원 수집 (사번 기준 중복 제거)
  const collectAllMembersInNode = (node: OrgNode): Map<string, { employeeId: string; relation: string; employmentType: string }> => {
    const memberMap = new Map<string, { employeeId: string; relation: string; employmentType: string }>();

    // 현재 노드의 멤버 추가
    node.members.forEach(m => {
      memberMap.set(m.employeeId, { employeeId: m.employeeId, relation: m.relation, employmentType: m.employmentType });
    });

    // 하위 노드들의 멤버 수집
    node.children.forEach(child => {
      const childMembers = collectAllMembersInNode(child);
      childMembers.forEach((value, key) => {
        // 이미 존재하지 않으면 추가 (중복 방지)
        if (!memberMap.has(key)) {
          memberMap.set(key, value);
        }
      });
    });

    return memberMap;
  };

  // 인원수 카운트 대상 고용형태
  const COUNTABLE_EMPLOYMENT_TYPES = ['임원', '정규_일반직', '정규직'];

  // 인원수 집계 대상 여부 확인 (사번이 KR로 시작하고 고용형태가 대상인 경우만)
  const isCountableEmployee = (emp: { employeeId: string; employmentType: string }): boolean => {
    return emp.employeeId.startsWith('KR') &&
           COUNTABLE_EMPLOYMENT_TYPES.includes(emp.employmentType);
  };

  // 각 노드의 총 인원수 계산 (하위 조직 포함, 사번 기준 중복 제거)
  // 사번이 KR로 시작하고 임원, 정규_일반직, 정규직만 인원수에 포함
  const calculateTotalMembers = (node: OrgNode): void => {
    // 먼저 하위 노드들의 인원수 계산
    node.children.forEach(child => {
      calculateTotalMembers(child);
    });

    // 현재 노드와 모든 하위 노드에서 고유한 직원 수집
    const allMembers = collectAllMembersInNode(node);

    // 고유 직원 수 계산 (사번 KR 시작 + 고용형태 조건)
    const countableMembers = Array.from(allMembers.values()).filter(isCountableEmployee);
    node.memberCount = countableMembers.length;
    node.concurrentCount = countableMembers.filter(m => m.relation === '겸직').length;
  };

  rootNodes.forEach(calculateTotalMembers);

  return rootNodes;
}

// 조직도를 엑셀 데이터로 변환
export function orgTreeToEmployees(rootNodes: OrgNode[]): Employee[] {
  const employees: Employee[] = [];

  const collectEmployees = (node: OrgNode, levelPath: string[] = []) => {
    const currentPath = [...levelPath, node.name];

    // 현재 노드의 직원들 수집
    node.members.forEach(emp => {
      // 레벨 정보 업데이트
      const updatedEmployee = { ...emp };
      updatedEmployee.levels = {
        level1: '이사회',
        level2: currentPath[0] || '',
        level3: currentPath[1],
        level4: currentPath[2],
        level5: currentPath[3],
        level6: currentPath[4],
        level7: currentPath[5],
        level8: currentPath[6],
      };
      employees.push(updatedEmployee);
    });

    // 자식 노드들 순회
    node.children.forEach(child => {
      collectEmployees(child, currentPath);
    });
  };

  rootNodes.forEach(node => collectEmployees(node));

  // No 재정렬
  employees.forEach((emp, idx) => {
    emp.no = idx + 1;
  });

  return employees;
}

// Employee 배열을 엑셀 워크북으로 변환
export function employeesToWorkbook(employees: Employee[]): XLSX.WorkBook {
  const data = employees.map(emp => ({
    'No': emp.no,
    '성명': emp.name,
    '사번': emp.employeeId,
    '부서': emp.department,
    '조직코드': emp.orgCode,
    '직책': emp.position,
    '사원관계': emp.relation,
    '조직장 여부': emp.isLeader ? 'Y' : 'N',
    '고용형태': emp.employmentType,
    '레벨1': emp.levels.level1,
    '레벨2': emp.levels.level2,
    '레벨3': emp.levels.level3 || '',
    '레벨4': emp.levels.level4 || '',
    '레벨5': emp.levels.level5 || '',
    '레벨6': emp.levels.level6 || '',
    '레벨7': emp.levels.level7 || '',
    '레벨8': emp.levels.level8 || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '조직도');

  return workbook;
}

// 엑셀 파일 다운로드
export function downloadExcel(workbook: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(workbook, fileName);
}
