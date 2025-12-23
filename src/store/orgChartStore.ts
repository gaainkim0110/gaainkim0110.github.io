import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Employee, OrgNode, OrgChartState, CachedData, AppSettings, ThemeMode, CustomColor } from '@/types';

interface OrgChartStore extends OrgChartState {
  // 캐시된 파일 목록
  cachedFiles: CachedData[];

  // 앱 설정
  settings: AppSettings;

  // 선택된 노드
  selectedNodeId: string | null;

  // 드래그 모드
  isDragMode: boolean;

  // Actions
  setOrgChart: (data: Partial<OrgChartState>) => void;
  setEmployees: (employees: Employee[]) => void;
  setRootNodes: (nodes: OrgNode[]) => void;
  toggleNodeExpand: (nodeId: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  moveNode: (nodeId: string, newParentId: string) => void;
  updateNode: (nodeId: string, updates: Partial<OrgNode>) => void;
  addNode: (parentId: string, node: Omit<OrgNode, 'id' | 'children'> & { members?: OrgNode['members'] }) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setDragMode: (isDragMode: boolean) => void;
  saveToCache: (fileName: string) => void;
  loadFromCache: (cacheId: string) => void;
  deleteFromCache: (cacheId: string) => void;
  clearAllCache: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  addCustomColor: (color: CustomColor) => void;
  removeCustomColor: (colorValue: string) => void;
  reset: () => void;
}

const initialSettings: AppSettings = {
  theme: 'system',
  backgroundColor: '#f0f0f0',
  nodeColors: {
    level2: '#70AD47',
    default: '#F2F2F2',
    executive: '#AAAAAA',
  },
  customColors: [],
};

const initialState: Omit<OrgChartState, 'lastImportDate'> & {
  cachedFiles: CachedData[];
  settings: AppSettings;
  selectedNodeId: string | null;
  isDragMode: boolean;
} = {
  rootNodes: [],
  employees: [],
  isDirty: false,
  fileName: undefined,
  cachedFiles: [],
  settings: initialSettings,
  selectedNodeId: null,
  isDragMode: false,
};

// Helper: 노드 트리에서 특정 노드 찾기
const findNode = (nodes: OrgNode[], nodeId: string): OrgNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const found = findNode(node.children, nodeId);
    if (found) return found;
  }
  return null;
};

// Helper: 노드 트리에서 부모 노드 찾기
const findParentNode = (nodes: OrgNode[], nodeId: string, parent: OrgNode | null = null): OrgNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return parent;
    const found = findParentNode(node.children, nodeId, node);
    if (found) return found;
  }
  return null;
};

// Helper: 노드 업데이트 (재귀)
const updateNodeInTree = (nodes: OrgNode[], nodeId: string, updater: (node: OrgNode) => OrgNode): OrgNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return updater(node);
    }
    return {
      ...node,
      children: updateNodeInTree(node.children, nodeId, updater),
    };
  });
};

// Helper: 모든 노드 펼침/접힘 상태 변경
const setAllNodesExpanded = (nodes: OrgNode[], isExpanded: boolean): OrgNode[] => {
  return nodes.map(node => ({
    ...node,
    isExpanded,
    children: setAllNodesExpanded(node.children, isExpanded),
  }));
};

// Helper: 노드 삭제
const removeNodeFromTree = (nodes: OrgNode[], nodeId: string): OrgNode[] => {
  return nodes
    .filter(node => node.id !== nodeId)
    .map(node => ({
      ...node,
      children: removeNodeFromTree(node.children, nodeId),
    }));
};

// Helper: 노드 추가
const addNodeToTree = (nodes: OrgNode[], parentId: string, newNode: OrgNode): OrgNode[] => {
  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, newNode],
      };
    }
    return {
      ...node,
      children: addNodeToTree(node.children, parentId, newNode),
    };
  });
};

// Helper: 노드와 모든 하위 노드에서 직원 정보 수집 (employeeId 기준 중복 제거)
const collectAllMembers = (node: OrgNode): Map<string, { relation: string; employmentType: string }> => {
  const memberMap = new Map<string, { relation: string; employmentType: string }>();

  // 현재 노드의 멤버 추가
  node.members.forEach(m => {
    memberMap.set(m.employeeId, { relation: m.relation, employmentType: m.employmentType });
  });

  // 하위 노드들의 멤버 수집
  node.children.forEach(child => {
    const childMembers = collectAllMembers(child);
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

// Helper: 전체 트리의 인원수 재계산 (하위 조직 포함, 사번 기준 중복 제거)
// 임원, 정규_일반직, 정규직만 인원수에 포함
const recalculateMemberCounts = (nodes: OrgNode[]): OrgNode[] => {
  return nodes.map(node => {
    // 먼저 자식 노드들의 인원수 재계산
    const updatedChildren = recalculateMemberCounts(node.children);

    // 업데이트된 자식을 가진 노드로 임시 생성
    const tempNode = { ...node, children: updatedChildren };

    // 현재 노드와 모든 하위 노드에서 고유한 직원 수집
    const allMembers = collectAllMembers(tempNode);

    // 고유 직원 수 계산 (임원, 정규_일반직, 정규직만 포함)
    const countableMembers = Array.from(allMembers.values()).filter(m =>
      COUNTABLE_EMPLOYMENT_TYPES.includes(m.employmentType)
    );
    const uniqueMemberCount = countableMembers.length;
    const uniqueConcurrentCount = countableMembers.filter(m => m.relation === '겸직').length;

    return {
      ...node,
      children: updatedChildren,
      memberCount: uniqueMemberCount,
      concurrentCount: uniqueConcurrentCount,
    };
  });
};

export const useOrgChartStore = create<OrgChartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOrgChart: (data) => set((state) => ({
        ...state,
        ...data,
        isDirty: true,
        lastImportDate: new Date(),
      })),

      setEmployees: (employees) => set({ employees, isDirty: true }),

      setRootNodes: (nodes) => set({ rootNodes: nodes, isDirty: true }),

      toggleNodeExpand: (nodeId) => set((state) => ({
        rootNodes: updateNodeInTree(state.rootNodes, nodeId, (node) => ({
          ...node,
          isExpanded: !node.isExpanded,
        })),
      })),

      expandAllNodes: () => set((state) => ({
        rootNodes: setAllNodesExpanded(state.rootNodes, true),
      })),

      collapseAllNodes: () => set((state) => ({
        rootNodes: setAllNodesExpanded(state.rootNodes, false),
      })),

      moveNode: (nodeId, newParentId) => set((state) => {
        const nodeToMove = findNode(state.rootNodes, nodeId);
        if (!nodeToMove) return state;

        // 자기 자신이나 자식 노드로 이동 불가
        if (nodeId === newParentId) return state;
        if (findNode([nodeToMove], newParentId)) return state;

        // 기존 위치에서 제거
        let newRootNodes = removeNodeFromTree(state.rootNodes, nodeId);

        // 새 위치에 추가 (이동된 노드에 isModified 플래그 설정)
        const movedNode = { ...nodeToMove, parentId: newParentId, isModified: true };
        newRootNodes = addNodeToTree(newRootNodes, newParentId, movedNode);

        // 인원수 재계산
        const recalculatedNodes = recalculateMemberCounts(newRootNodes);

        return {
          rootNodes: recalculatedNodes,
          isDirty: true,
        };
      }),

      updateNode: (nodeId, updates) => set((state) => {
        // 먼저 노드 업데이트
        const updatedNodes = updateNodeInTree(state.rootNodes, nodeId, (node) => ({
          ...node,
          ...updates,
        }));
        // 인원수 재계산
        const recalculatedNodes = recalculateMemberCounts(updatedNodes);
        return {
          rootNodes: recalculatedNodes,
          isDirty: true,
        };
      }),

      addNode: (parentId, nodeData) => set((state) => {
        const newNode: OrgNode = {
          ...nodeData,
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          children: [],
          members: nodeData.members || [],
          parentId,
        };

        const updatedNodes = addNodeToTree(state.rootNodes, parentId, newNode);
        // 인원수 재계산
        const recalculatedNodes = recalculateMemberCounts(updatedNodes);

        return {
          rootNodes: recalculatedNodes,
          isDirty: true,
        };
      }),

      deleteNode: (nodeId) => set((state) => {
        const newRootNodes = removeNodeFromTree(state.rootNodes, nodeId);
        // 인원수 재계산
        const recalculatedNodes = recalculateMemberCounts(newRootNodes);
        return {
          rootNodes: recalculatedNodes,
          isDirty: true,
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        };
      }),

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

      setDragMode: (isDragMode) => set({ isDragMode }),

      saveToCache: (fileName) => {
        const state = get();
        const cacheData: CachedData = {
          id: `cache_${Date.now()}`,
          fileName,
          savedAt: new Date(),
          orgChartState: {
            rootNodes: state.rootNodes,
            employees: state.employees,
            isDirty: false,
            fileName,
            lastImportDate: state.lastImportDate,
          },
        };

        set((state) => ({
          cachedFiles: [cacheData, ...state.cachedFiles.filter(c => c.fileName !== fileName)].slice(0, 10),
          isDirty: false,
        }));
      },

      loadFromCache: (cacheId) => {
        const state = get();
        const cached = state.cachedFiles.find(c => c.id === cacheId);
        if (cached) {
          set({
            ...cached.orgChartState,
            isDirty: false,
          });
        }
      },

      deleteFromCache: (cacheId) => set((state) => ({
        cachedFiles: state.cachedFiles.filter(c => c.id !== cacheId),
      })),

      clearAllCache: () => set({ cachedFiles: [] }),

      setTheme: (theme) => set((state) => ({
        settings: { ...state.settings, theme },
      })),

      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      addCustomColor: (color) => set((state) => ({
        settings: {
          ...state.settings,
          customColors: [...(state.settings.customColors || []), color],
        },
      })),

      removeCustomColor: (colorValue) => set((state) => ({
        settings: {
          ...state.settings,
          customColors: (state.settings.customColors || []).filter(c => c.value !== colorValue),
        },
      })),

      reset: () => set({
        ...initialState,
        cachedFiles: get().cachedFiles,
        settings: get().settings,
      }),
    }),
    {
      name: 'org-chart-storage',
      storage: createJSONStorage(() => localStorage),
      // 설정만 저장 (cachedFiles는 데이터가 커서 localStorage 용량 초과 가능)
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
