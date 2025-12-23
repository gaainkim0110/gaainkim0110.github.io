# 조직도 관리 프로그램 소프트웨어 명세서

**문서 버전:** 1.0  
**작성일:** 2025년 12월 23일  
**프로젝트명:** 조직도 관리 프로그램 (Organization Chart Manager)

---

## 1. 프로젝트 개요

### 1.1 목적
Hierarchy 구조의 조직도를 시각화하고, 엑셀 파일을 통한 데이터 Import/Export 및 실시간 편집이 가능한 웹 애플리케이션 개발

### 1.2 핵심 기능 요약
| 기능 | 설명 |
|------|------|
| Import | 엑셀 파일(.xlsx)을 업로드하여 조직도 자동 생성 |
| 시각화 | 계층적 조직도 트리 구조 표시 |
| 편집 | 노드 드래그 앤 드롭으로 조직 이동 |
| Export | 수정된 조직도를 엑셀 파일(import한 엑셀과 같은 형태) 또는 조직도 이미지(png)로 다운로드 |

---

## 2. 기술 스택

### 2.1 프레임워크 및 언어
| 구분 | 기술 |
|------|------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS / CSS Modules |
| State Management | React Context API 또는 Zustand |

### 2.2 주요 라이브러리
| 라이브러리 | 용도 | 버전 |
|------------|------|------|
| `xlsx` / `exceljs` | 엑셀 파일 파싱 및 생성 | 최신 |
| `react-d3-tree` 또는 `react-organizational-chart` | 조직도 시각화 | 최신 |
| `@dnd-kit/core` | 드래그 앤 드롭 기능 | 최신 |
| `localforage` 또는 `idb` | 브라우저 캐시(IndexedDB) | 최신 |

### 2.3 호스팅
| 항목 | 내용 |
|------|------|
| 플랫폼 | GitHub Pages |
| 도메인 | `gaainkim0110.github.io` |
| 빌드 방식 | Static Export (`next export`) |
| 배포 자동화 | GitHub Actions |

### 2.4 폰트
| 폰트명 | 적용 방식 |
|--------|----------|
| 나눔스퀘어 네오 (NanumSquare Neo) | Google Fonts CDN 또는 @font-face 로컬 호스팅 |

**폰트 Weight 사용:**
- Regular (400): 일반 노드 텍스트
- ExtraBold (800): 임원 조직장 텍스트

---

## 3. 데이터 구조

### 3.1 엑셀 파일 컬럼 정의

| 컬럼명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| No | Number | Y | 데이터 행 번호 |
| 성명 | String | Y | 직원 이름 |
| 사번 | String | Y | 직원 고유번호 (Primary Key) |
| 부서 | String | Y | 최종 소속 조직명 |
| 조직코드 | String | Y | 최종 소속 조직의 고유번호 |
| 직책 | String | Y | 직원의 직책명 |
| 사원관계 | Enum | Y | "원소속" 또는 "겸직" |
| 조직장 여부 | Enum | Y | "Y" 또는 "N" |
| 고용형태 | String | Y | 고용 형태 (정규직, 임원 등) |
| 레벨1 | String | Y | 최상위 조직 (항상 "이사회") |
| 레벨2 | String | Y | 법인명 (NAVER, NAVER CLOUD 등) |
| 레벨3 | String | N | 3단계 조직 |
| 레벨4 | String | N | 4단계 조직 |
| 레벨5 | String | N | 5단계 조직 |
| 레벨6 | String | N | 6단계 조직 |
| 레벨7 | String | N | 7단계 조직 |
| 레벨8 | String | N | 8단계 조직 (최하위) |

### 3.2 TypeScript 인터페이스 정의

```typescript
// 직원 정보 인터페이스
interface Employee {
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
interface OrgNode {
  id: string;                      // 조직코드 또는 고유 ID
  name: string;                    // 조직명
  level: number;                   // 레벨 (2~8)
  leader?: {
    name: string;                  // 조직장 이름
    isExecutive: boolean;          // 임원 여부
    isConcurrent: boolean;         // 겸직 여부
  };
  memberCount: number;             // 총 인원수
  members: Employee[];             // 소속 직원 목록
  children: OrgNode[];             // 하위 조직
  isExpanded: boolean;             // 펼침/접힘 상태
  parentId?: string;               // 상위 조직 ID
}

// 전체 조직도 상태
interface OrgChartState {
  rootNodes: OrgNode[];            // 레벨2 노드들 (법인)
  employees: Employee[];           // 전체 직원 목록
  lastImportDate?: Date;           // 마지막 Import 일시
  isDirty: boolean;                // 수정 여부
}
```

### 3.3 샘플 데이터 예시

| No | 성명 | 사번 | 부서 | 조직코드 | 직책 | 사원관계 | 조직장 여부 | 고용형태 | 레벨1 | 레벨2 | 레벨3 | 레벨4 | 레벨5 |
|----|------|------|------|----------|------|----------|-------------|----------|-------|-------|-------|-------|-------|
| 1 | 김대표 | E001 | NAVER | ORG001 | 대표이사 | 원소속 | Y | 임원 | 이사회 | NAVER | | | |
| 2 | 홍길동 | E002 | OD | ORG005 | 팀장 | 원소속 | Y | 정규직 | 이사회 | NAVER | HR | Leadership Insight | Organizational Development |
| 3 | 이철수 | E003 | OD | ORG005 | 선임 | 원소속 | N | 정규직 | 이사회 | NAVER | HR | Leadership Insight | Organizational Development |
| 4 | 박영희 | E004 | OD | ORG005 | 팀장 | 겸직 | Y | 정규직 | 이사회 | NAVER | HR | Leadership Insight | Organizational Development |

---

## 4. 기능 명세

### 4.1 Import 기능

#### 4.1.1 파일 업로드
```
[기능 ID] IMPORT-001
[기능명] 엑셀 파일 업로드
[설명] 사용자가 로컬 엑셀 파일(.xlsx)을 선택하여 업로드

[동작 흐름]
0. 캐시 폴더 data/ 내 엑셀 파일이 있는 경우:
   - 파일리스트를 VSCODE 첫화면 처럼 보여주고 클릭하여 바로 업로드 가능하도록 설정
   - 파일리스트 하단에 "파일 업로드" 와 "새로운 조직도 생성하기" 버튼을 크게 표시 
1. "파일 업로드" 버튼 클릭
1-2. 파일 선택 다이얼로그 표시 (accept: .xlsx, .xls)
1-3. 파일 선택 시 파싱 시작
1-4. 파싱 완료 후 조직도 렌더링
1-5. data/ 에 파일원본과 수정된 조직도 캐시를 저장
2. "새로운 조직도 생성하기" 버튼 클릭
2-1. 배경 색상을 선택한 후 빈 조직도를 생성하고 렌더링
2-2. "조직 추가" 버튼 클릭
2-3. 조직명, 조직장 이름 인원 등 입력 후 노드 색 설정 후 "추가" 버튼 클릭
2-4. 생성된 노드 클릭 -> 선택된 노드 border가 네온사인으로 하이라이트 되면서 "조직 옮기기", "편집", "삭제", "추가" 버튼 표시
2-4-1. "추가"시 하위 노드 추가 -> 2-3 부터 반복
2-5. 노드 더블 클릭 -> 노드를 드래그 & 드롭으로 옮길 수 있도록 상태 변경("조직 옮기기" 활성화)

[예외 처리]
- 지원하지 않는 파일 형식: 오류 메시지 표시
- 필수 컬럼 누락: 누락된 컬럼 명시 후 오류 처리
- 데이터 형식 오류: 해당 행 번호와 함께 오류 표시
```


#### 4.1.3 캐시 기능
```
[기능 ID] IMPORT-003
[기능명] 브라우저 캐시 관리
[설명] IndexedDB를 활용한 데이터 영속성 제공

[저장 데이터]
- 파싱된 직원 데이터
- 조직 트리 구조
- 마지막 수정 시간
- 원본 파일 정보

[동작]
- 페이지 로드 시 캐시 데이터 존재 여부 확인
- 캐시 존재 시 "이전 데이터 불러오기" 옵션 제공
- 명시적 "캐시 삭제" 기능 제공
```

### 4.2 조직도 시각화

#### 4.2.1 트리 구조 렌더링
```
[기능 ID] VIEW-001
[기능명] 조직도 트리 렌더링
[설명] 계층적 조직 구조를 시각적 트리로 표시

[렌더링 규칙]
- 노드 배경 색상은 조직명 셀에만 적용
- 레벨1(이사회)은 표시하지 않음
- 레벨2부터 화면에 표시
- 각 노드는 조직명과 조직장 정보 표시
  - 모든 조직에는 조직장이 필수로 있음 (데이터 무결성 검증후 조직장이 없는 경우 경고 아이콘과 빨간색으로 "조직장 추가 요망" 표시하여 편집으로 추가하도록 유도)
- 각 노드를 클릭시 하위 노드들이 자연스럽게 접혔다가 펴지는 애니메이션 추가

[레이아웃]
- 방향: 상단 → 하단 (Top-to-Bottom)
- 노드 간격: 수평 100px, 수직 80px
- 연결선: 곡선 또는 직선 (설정 가능)
```

#### 4.2.2 노드 스타일 규격

**레벨2 노드 (법인)**
```css
.node-level2 {
  background-color: #70AD47;
  color: #FFFFFF;
  font-family: 'NanumSquare Neo ExtraBold', sans-serif;
  font-weight: 800; /* ExtraBold */
  padding: 12px 20px;
  border-radius: 8px;
  min-width: 150px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

**레벨3~8 노드 (일반 조직)**
```css
.node-level-default {
  background-color: #F2F2F2;
  color: #333333;
  font-family: 'NanumSquare Neo', sans-serif;
  font-weight: 400; /* Regular */
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #DDDDDD;
  min-width: 120px;
  text-align: center;
}
```

**임원 조직장 노드**
```css
.node-executive-leader {
  background-color: #AAAAAA;
  color: #FFFFFF;
  font-family: 'NanumSquare Neo ExtraBold', sans-serif;
  font-weight: 800; /* ExtraBold */
  padding: 10px 16px;
  border-radius: 6px;
  min-width: 120px;
  text-align: center;
}
```

#### 4.2.3 노드 표시 내용

**Leaf 노드 표시 형식:**
```
┌─────────────────────────────┐
│  Organizational Development │  ← 조직명
│-----------------------------│
│         홍길동 | 15           │  ← 조직장명 | 인원수
└─────────────────────────────┘

겸직 조직장의 경우:
┌─────────────────────────────┐
│  Communication Secrecy      │
│-----------------------------│
│       겸)홍길동 | 15/1        │  ← "겸)" 접두어 추가 + 원소속내인원/겸직조직내인원
└─────────────────────────────┘
```

### 4.3 상호작용 기능

#### 4.3.1 Toggle (펼침/접힘)
```
[기능 ID] INTERACT-001
[기능명] 노드 Toggle
[설명] 노드 클릭 시 하위 노드 표시/숨김

[동작]
- Hover: 꿈틀거리는 애니메이션
- 클릭: 하위 조직 노드 펼침/접힘 토글
- 펼침 상태: 하위 노드 및 연결선 표시
- 접힘 상태: 하위 노드 숨김, 접힘 표시 아이콘(+) 표시

[시각적 피드백]
- 펼침 가능 노드: 우측 하단에 ▼ 아이콘
- 접힘 상태 노드: 우측 하단에 ▶ 아이콘
```

#### 4.3.2 팀원 목록 Expand
```
[기능 ID] INTERACT-002
[기능명] Leaf 노드 팀원 목록 표시
[설명] Leaf 노드 클릭 시 해당 조직의 팀원 목록 표시

[동작]
1. Leaf 노드 "팀원 보기" 버튼 클릭
2. 노드 하단에 팀원 리스트 패널 Expand
3. 팀원 이름만 리스트 형태로 표시
4. 다시 클릭 시 접힘

[표시 형식]
┌─────────────────────────────┐
│  Organizational Development │ 
│-----------------------------│
│         홍길동 | 15           │
└─────────────────────────────┘
   │ • 이철수                     
   │ • 김영희                     
   │ • 박민수                     
   │ • ...                       
```

#### 4.3.3 조직 이동 (드래그 앤 드롭)
```
[기능 ID] INTERACT-003
[기능명] 조직 노드 이동 (Drag & Drop)
[설명] 노드를 다른 조직으로 드래그하여 이동

[대상]
- 중간 레벨 노드는 이동시 하위까지 함께 옮겨짐

[동작 흐름]
1. 더블클릭 혹은 "조직 옮기기" 버튼을 통해 활성화 -> 노드 드래그 시작
2. 유효한 Drop 대상 연한 dashed-border로 하이라이트 표시
3. Drop 시 확인 다이얼로그 표시
4. 확인 시 조직 변경 적용
5. 관련 직원 데이터의 레벨 정보 자동 업데이트

[제약 조건]
- 동일 조직으로 이동 불가
- 이동 시 해당 하위 조직 모든 직원의 조직명이 일괄 변경됨

[시각적 피드백]
- 드래그 중: 반투명 노드 복제본 표시
- 유효 대상: 녹색 테두리 하이라이트
- 무효 대상: 빨간색 테두리 또는 금지 아이콘
```

### 4.4 Export 기능

```
[기능 ID] EXPORT-001
[기능명] 엑셀 파일 Export
[설명] 현재 조직도 상태를 원본 형식과 동일한 엑셀 파일로 다운로드

[동작 흐름]
1. "Export" 버튼 클릭
2. PNG, PDF, EXCEL 중 선택
2-1 Excel 선택시:
- 현재 조직도 상태를 Employee[] 배열로 변환
- 원본 컬럼 순서대로 엑셀 파일 생성
- 파일 다운로드 트리거
2-2 PNG 선택시:
- 조직도 영역만 PNG 파일로 다운로드
2-3 PDF 선택시:
- 조직도 영역만 이미지로 렌더링 후 PDF 파일로 다운로드

[파일명 규칙]
- 형식: org_chart_export_YYYYMMDD_HHmmss.xlsx
- 예시: org_chart_export_20251223_143052.xlsx

[데이터 정합성]
- 이동된 노드의 레벨 정보 자동 갱신
- No 컬럼 재정렬
- 원본 컬럼 순서 유지
```

---

## 5. 화면 설계

### 5.1 전체 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  [Logo] 조직도 관리 프로그램        [Import] [Export]     │  ← Header
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────────┐   │
│  │                                               │   │
│  │           조직도 영역                            │   │
│  │                                               │   │
│  │         ┌─────────┐                           │   │
│  │         │ NAVER   │                           │   │
│  │         └────┬────┘                           │   │
│  │              │                                │   │
│  │    ┌─────────┼─────────┐                      │   │
│  │    │         │         │                      │   │
│  │ ┌──┴──┐   ┌──┴──┐   ┌──┴──┐                   │   │
│  │ │ HR  │   │ Dev │   │ Biz │                   │   │
│  │ └──┬──┘   └─────┘   └─────┘                   │   │
│  │    │                                          │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  [Zoom In] [Zoom Out] [Fit] [Reset]     [Theme Toggle(Light/Dark)]    │  ← Footer/Controls
└──────────────────────────────────────────────────────┘
```


### 7.3 폰트 설정 (globals.css)

```css
@font-face {
  font-family: 'NanumSquare Neo';
  font-style: normal;
  src: url('/fonts/NanumSquareNeoTTF-bRg.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'NanumSquare Neo ExtraBold';
  font-style: normal;
  src: url('/fonts/NanumSquareNeoTTF-dEb.woff2') format('woff2');
  font-display: swap;
}

:root {
  --font-primary: 'NanumSquare Neo', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* 노드 색상 */
  --color-node-level2: #70AD47;
  --color-node-default: #F2F2F2;
  --color-node-executive: #AAAAAA;
  
  /* 텍스트 색상 */
  --color-text-primary: #333333;
  --color-text-inverse: #FFFFFF;
}

body {
  font-family: var(--font-primary);
}
```

---

## 8. 성능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 초기 로딩 시간 | < 3초 (3G 환경 기준) |
| 엑셀 파싱 시간 | < 5초 (1,000행 기준) |
| 조직도 렌더링 | < 1초 (500개 노드 기준) |
| 드래그 앤 드롭 | 60fps 유지 |

---

## 9. 브라우저 호환성

| 브라우저 | 지원 버전 |
|----------|----------|
| Chrome | 최신 2개 버전 |
| Firefox | 최신 2개 버전 |
| Safari | 최신 2개 버전 |
| Edge | 최신 2개 버전 |

---

## 10. 향후 확장 고려사항

1. **검색 기능**: 직원명/부서명으로 노드 검색 및 하이라이트
2. **필터링**: 특정 법인/레벨만 표시
3. **히스토리**: Undo/Redo 기능
4. **다중 선택**: 여러 노드 동시 이동
5. **인쇄**: 조직도 PDF/이미지 출력
6. **다국어 지원**: 영문/한글 전환

---

## 11. 용어 정의

| 용어 | 정의 |
|------|------|
| 원소속 | 직원의 주된 소속 조직 (1인 1개) |
| 겸직 | 원소속 외 추가로 소속된 조직 |
| Leaf 노드 | 하위 조직이 없는 최하위 조직 |
| 조직장 | 해당 조직을 대표하는 직원 |
| 임원 | 고용형태가 "임원"인 직원 |

---

## 12. 디자인

- Liquid Glass Design 적용
- 사용자 시스템 환경에 따라 Light/Dark 모드 지원
- 배경 및 Node 색상 설정 기능


## 부록 A: 엑셀 파일 템플릿

[sample_org_data.xlsx 파일 구조]

| No | 성명 | 사번 | 부서 | 조직코드 | 직책 | 사원관계 | 조직장 여부 | 고용형태 | 레벨1 | 레벨2 | 레벨3 | 레벨4 | 레벨5 | 레벨6 | 레벨7 | 레벨8 |
|----|------|------|------|----------|------|----------|-------------|----------|-------|-------|-------|-------|-------|-------|-------|-------|
| 1 | ... | ... | ... | ... | ... | ... | ... | ... | 이사회 | ... | ... | ... | ... | ... | ... | ... |

---

## 실행 방법
- Windows
  - 설치: setup.bat
  - 실행: run_dev.bat
- Linux/ MacOS
  - 설치: setup.sh
  - 실행: run_dev.sh

**문서 끝**
