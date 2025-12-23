// 직원 정보 인터페이스
export interface Employee {
  no: number;
  name: string;                    // 성명
  employeeId: string;              // 사번
  department: string;              // 부서
  orgCode: string;                 // 조직코드
  position: string;                // 직책
  relation: '원소속' | '겸직';      // 사원관계
  isLeader: boolean;               // 조직장 여부
  employmentType: string;          // 고용형태
  levels: {
    level1: string;                // 항상 "이사회"
    level2: string;                // 법인명
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    level7?: string;
    level8?: string;
  };
}

// 조직 노드 인터페이스
export interface OrgNode {
  id: string;                      // 조직코드 또는 고유 ID
  name: string;                    // 조직명
  level: number;                   // 레벨 (2~8)
  leader?: {
    name: string;                  // 조직장 이름
    isExecutive: boolean;          // 임원 여부
    isConcurrent: boolean;         // 겸직 여부
  };
  memberCount: number;             // 총 인원수
  concurrentCount: number;         // 겸직 인원수
  members: Employee[];             // 소속 직원 목록
  children: OrgNode[];             // 하위 조직
  isExpanded: boolean;             // 펼침/접힘 상태
  parentId?: string;               // 상위 조직 ID
  color?: string;                  // 노드 배경색 (사용자 지정)
  isModified?: boolean;            // 수정/이동 여부 (색상 변경용)
  isDeleted?: boolean;             // 삭제 예정 여부
}

// 전체 조직도 상태
export interface OrgChartState {
  rootNodes: OrgNode[];            // 레벨2 노드들 (법인)
  employees: Employee[];           // 전체 직원 목록
  lastImportDate?: Date;           // 마지막 Import 일시
  isDirty: boolean;                // 수정 여부
  fileName?: string;               // 원본 파일명
}

// 캐시 데이터 구조
export interface CachedData {
  id: string;
  fileName: string;
  savedAt: Date;
  orgChartState: OrgChartState;
}

// 엑셀 컬럼 매핑
export const EXCEL_COLUMNS = {
  no: 'No',
  name: '성명',
  employeeId: '사번',
  department: '부서',
  orgCode: '조직코드',
  position: '직책',
  relation: '사원관계',
  isLeader: '조직장 여부',
  employmentType: '고용형태',
  level1: '레벨1',
  level2: '레벨2',
  level3: '레벨3',
  level4: '레벨4',
  level5: '레벨5',
  level6: '레벨6',
  level7: '레벨7',
  level8: '레벨8',
} as const;

// 필수 컬럼
export const REQUIRED_COLUMNS = [
  'No', '성명', '사번', '부서', '조직코드', '직책',
  '사원관계', '조직장 여부', '고용형태', '레벨1', '레벨2'
] as const;

// Export 형식
export type ExportFormat = 'xlsx' | 'png' | 'pdf';

// 테마 설정
export type ThemeMode = 'light' | 'dark' | 'system';

// 앱 설정
export interface AppSettings {
  theme: ThemeMode;
  backgroundColor: string;
  nodeColors: {
    level2: string;
    default: string;
    executive: string;
  };
}
