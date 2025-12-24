'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { OrgNode as OrgNodeType, Employee } from '@/types';
import { useOrgChartStore } from '@/store/orgChartStore';
import EditDialog from './EditDialog';
import AddNodeDialog, { NEW_NODE_COLOR } from './AddNodeDialog';
import clsx from 'clsx';

// 수정/이동된 노드 색상
const MODIFIED_COLOR = '#419CFF';
// 엑셀 레벨4 (displayLevel 3) 색상
const LEVEL4_COLOR = '#002060';
// 삭제 예정 노드 색상
const DELETED_COLOR = '#000000';
// 신설 노드 색상
const NEW_COLOR = '#FF6861';

// 색상 밝기 계산 (밝으면 true, 어두우면 false)
const isLightColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // 밝기 계산 (0-255, 128 이상이면 밝은 색)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
};
// 인원수 카운트 및 팀원 목록 표시 대상 고용형태
const COUNTABLE_EMPLOYMENT_TYPES = ['임원', '정규_일반직', '정규직'];

// 인원수 집계 대상 여부 확인 (사번이 KR로 시작하고 고용형태가 대상인 경우만)
const isCountableEmployee = (employee: Employee): boolean => {
  return employee.employeeId.startsWith('KR') &&
         COUNTABLE_EMPLOYMENT_TYPES.includes(employee.employmentType);
};
// 기본 Border가 표시되어야 하는 색상들 (수정, 폐지, 신설)
const DEFAULT_BORDER_COLORS = [MODIFIED_COLOR, DELETED_COLOR, NEW_COLOR];

// 노드 색상 옵션
const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', color: 'transparent', isDefault: true },
  { value: '#FFFFFF', label: '일반', color: '#FFFFFF', isDefault: false },
  { value: '#70AD47', label: '레벨2', color: '#70AD47', isDefault: false },
  { value: '#002060', label: '레벨4', color: '#002060', isDefault: false },
  { value: '#419CFF', label: '수정', color: '#419CFF', isDefault: false },
  { value: '#FF6861', label: '신설', color: '#FF6861', isDefault: false },
  { value: '#AAAAAA', label: '임원', color: '#AAAAAA', isDefault: false },
  { value: '#000000', label: '폐지', color: '#000000', isDefault: false },
] as const;

interface OrgNodeProps {
  node: OrgNodeType;
  onSelect?: (nodeId: string) => void;
  onToggle?: (nodeId: string) => void;
}

const LONG_PRESS_DURATION = 500; // 길게 누르기 시간 (ms)

export default function OrgNode({ node, onSelect, onToggle }: OrgNodeProps) {
  const [showMembers, setShowMembers] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 인라인 편집 모드 (중간 노드용)
  const [showEditDialog, setShowEditDialog] = useState(false); // 다이얼로그 (leaf 노드용)
  const [showAddDialog, setShowAddDialog] = useState(false); // 추가 다이얼로그
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 삭제 확인 다이얼로그
  const [editName, setEditName] = useState(node.name);
  const [editLeader, setEditLeader] = useState(node.leader?.name || '');
  const [editColor, setEditColor] = useState(node.color || 'default');
  const [showCustomColorInput, setShowCustomColorInput] = useState(false); // 커스텀 색상 입력 모드
  const [customColorValue, setCustomColorValue] = useState('#000000'); // 커스텀 색상 값
  const [customColorLabel, setCustomColorLabel] = useState(''); // 커스텀 색상 라벨
  const [customColorHasBorder, setCustomColorHasBorder] = useState(true); // 커스텀 색상 border 여부
  const { selectedNodeId, isDragMode, setSelectedNode, setDragMode, updateNode, addNode, deleteNode, settings, addCustomColor, removeCustomColor } = useOrgChartStore();

  // 커스텀 색상 중 border가 있는 색상들 추가 (대소문자 통일)
  const borderColors = useMemo(() => {
    const customBorderColors = (settings.customColors || [])
      .filter(c => c.hasBorder)
      .map(c => c.value.toUpperCase());
    return [...DEFAULT_BORDER_COLORS, ...customBorderColors];
  }, [settings.customColors]);

  // 노드에 적용할 실제 border 색상 결정 (isModified, isDeleted 상태 포함)
  const effectiveBorderColor = useMemo(() => {
    // 삭제 예정 노드
    if (node.isDeleted) return DELETED_COLOR;
    // 사용자가 명시적으로 색상을 설정한 경우
    if (node.color) {
      // 해당 색상이 border가 있는 색상이면 border 표시
      if (borderColors.includes(node.color.toUpperCase())) return node.color;
      // 그렇지 않으면 border 없음 (사용자 색상이 isModified보다 우선)
      return null;
    }
    // 사용자가 색상을 설정하지 않은 경우에만 isModified 체크
    if (node.isModified) return MODIFIED_COLOR;
    return null;
  }, [node.isDeleted, node.color, node.isModified, borderColors]);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const isSelected = selectedNodeId === node.id;
  const isLeaf = node.children.length === 0;
  const hasLeader = !!node.leader;
  const isExecutive = node.leader?.isExecutive;

  // 드래그 설정
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    disabled: !isDragMode,
    data: { node },
  });

  // 드롭 설정
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: { node },
  });

  // 길게 누르기 시작
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setSelectedNode(node.id);
      setDragMode(true);
      setShowActions(false);
    }, LONG_PRESS_DURATION);
  }, [node.id, setSelectedNode, setDragMode]);

  // 길게 누르기 종료
  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 단순 클릭: 하위 노드 토글 또는 leaf 노드면 팀원 보기
  const handleClick = useCallback(() => {
    if (isDragMode || isLongPress.current) return;

    // 액션 버튼이 표시 중이면 닫기
    if (showActions) {
      setShowActions(false);
      setSelectedNode(null);
      return;
    }

    // leaf 노드면 팀원 목록 토글
    if (isLeaf && node.members.length > 0) {
      setShowMembers(!showMembers);
    } else if (!isLeaf && onToggle) {
      // 하위 노드 있으면 접었다 펴기
      onToggle(node.id);
    }
  }, [isDragMode, isLeaf, node.id, node.members.length, showMembers, onToggle, showActions, setSelectedNode]);

  // 더블 클릭: 액션 버튼 표시
  const handleDoubleClick = useCallback(() => {
    if (isDragMode) return;
    setSelectedNode(node.id);
    setShowActions(true);
    setShowMembers(false);
  }, [isDragMode, node.id, setSelectedNode]);

  // 액션 버튼 닫기
  const handleCloseActions = useCallback(() => {
    setShowActions(false);
    setSelectedNode(null);
  }, [setSelectedNode]);

  // 바깥 클릭 시 액션 버튼 닫기
  const nodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showActions) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setSelectedNode(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions, setSelectedNode]);

  // 삭제 확인 다이얼로그 열릴 때 body 스크롤 잠금
  // (EditDialog, AddNodeDialog는 각자 스크롤 잠금 처리함)
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showDeleteConfirm]);

  // 조직명 행 스타일 결정 (첫번째 행)
  const getHeaderStyle = () => {
    // 삭제 예정 노드는 검정색 배경 + 흰색 텍스트
    if (node.isDeleted) {
      return 'text-white font-nanum-bold';
    }
    // 사용자가 직접 설정한 색상이 있으면 밝기에 따라 텍스트 색상 결정
    if (node.color) {
      const textColor = isLightColor(node.color) ? 'text-gray-800' : 'text-white';
      return `${textColor} font-nanum-bold`;
    }
    // 수정/이동된 노드는 파란색 배경 (color가 없는 경우에만)
    if (node.isModified) {
      return 'text-white font-nanum-bold';
    }
    if (node.level === 2) {
      return 'bg-node-level2 text-white font-nanum-bold';
    }
    // 엑셀 레벨4 (displayLevel 3)
    if (node.level === 3) {
      return 'text-white font-nanum-bold';
    }
    // 임원인 경우: ExtraBold 폰트 + 검정색 텍스트
    if (isExecutive) {
      return 'bg-node-executive text-black font-nanum-extrabold';
    }
    return 'bg-node-default text-text-primary';
  };

  // 조직명 행 배경색
  const getHeaderBgColor = () => {
    // 삭제 예정 노드는 검정색
    if (node.isDeleted) return DELETED_COLOR;
    // 사용자가 직접 설정한 색상이 있으면 우선
    if (node.color) return node.color;
    // 수정/이동된 노드는 파란색 (color가 없는 경우에만)
    if (node.isModified) return MODIFIED_COLOR;
    // 엑셀 레벨4 (displayLevel 3)
    if (node.level === 3) return LEVEL4_COLOR;
    return undefined;
  };

  // 편집 버튼 클릭 핸들러
  const handleEdit = useCallback(() => {
    setShowActions(false);
    if (isLeaf) {
      // Leaf 노드: 다이얼로그 열기
      setShowEditDialog(true);
    } else {
      // 중간 노드: 인라인 편집 모드
      setEditName(node.name);
      setEditLeader(node.leader?.name || '');
      setEditColor(node.color || 'default');
      setIsEditing(true);
    }
  }, [isLeaf, node.name, node.leader?.name, node.color]);

  // 인라인 편집 저장 (중간 노드)
  const handleSaveInlineEdit = useCallback(() => {
    // 'default' 선택 시 color를 undefined로 설정하여 기존 우선순위 적용
    const newColor = editColor === 'default' ? undefined : editColor;
    // 색상 변경은 isModified에 영향을 주지 않음 (이름, 조직장 변경만 구조적 변경으로 간주)
    const hasStructuralChanges = editName !== node.name || editLeader !== (node.leader?.name || '');

    updateNode(node.id, {
      name: editName,
      leader: editLeader ? {
        name: editLeader,
        isExecutive: node.leader?.isExecutive || false,
        isConcurrent: node.leader?.isConcurrent || false,
      } : undefined,
      color: newColor,
      isModified: hasStructuralChanges ? true : node.isModified,
    });
    setShowCustomColorInput(false);
    setCustomColorValue('#000000');
    setCustomColorLabel('');
    setCustomColorHasBorder(true);
    setIsEditing(false);
  }, [node.id, node.name, node.leader, node.color, editName, editLeader, editColor, updateNode]);

  // 인라인 편집 취소
  const handleCancelInlineEdit = useCallback(() => {
    setEditName(node.name);
    setEditLeader(node.leader?.name || '');
    setEditColor(node.color || 'default');
    setShowCustomColorInput(false);
    setCustomColorValue('#000000');
    setCustomColorLabel('');
    setCustomColorHasBorder(true);
    setIsEditing(false);
  }, [node.name, node.leader?.name, node.color]);

  // 다이얼로그 저장 (Leaf 노드)
  const handleDialogSave = useCallback((updates: {
    name: string;
    leader?: { name: string; isExecutive: boolean; isConcurrent: boolean };
    members: Employee[];
    color?: string;
  }) => {
    // 색상 변경은 isModified에 영향을 주지 않음 (이름, 조직장, 멤버 변경만 구조적 변경으로 간주)
    const hasStructuralChanges =
      updates.name !== node.name ||
      updates.leader?.name !== node.leader?.name ||
      updates.members.length !== node.members.length;

    updateNode(node.id, {
      name: updates.name,
      leader: updates.leader,
      members: updates.members,
      memberCount: updates.members.length,
      concurrentCount: updates.members.filter(m => m.relation === '겸직').length,
      color: updates.color || undefined,
      isModified: hasStructuralChanges ? true : node.isModified,
    });
  }, [node.id, node.name, node.leader, node.members, node.color, updateNode]);

  // 삭제 버튼 클릭 핸들러 (확인 다이얼로그 표시)
  const handleDelete = useCallback(() => {
    setShowActions(false);
    setShowDeleteConfirm(true);
  }, []);

  // 삭제 확인 핸들러 (실제 삭제 수행)
  const handleConfirmDelete = useCallback(() => {
    deleteNode(node.id);
    setShowDeleteConfirm(false);
  }, [node.id, deleteNode]);

  // 삭제 취소 핸들러
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // 추가 버튼 클릭 핸들러
  const handleAdd = useCallback(() => {
    setShowActions(false);
    setShowAddDialog(true);
  }, []);

  // 하위 조직 추가 저장 핸들러
  const handleAddNodeSave = useCallback((data: {
    name: string;
    orgCode: string;
    leader?: Employee;
    members: Employee[];
    movedMemberIds: string[];
  }) => {
    // 모든 멤버 합치기 (조직장 포함)
    const allMembers: Employee[] = data.leader ? [data.leader, ...data.members] : [...data.members];

    // 상위 조직에서 원소속 직원만 제거 (겸직은 유지)
    // 겸직으로 이동한 직원은 기존 조직에도 남아있어야 함
    const originalMemberIds = new Set([
      ...data.members.filter(m => m.relation === '원소속').map(m => m.employeeId),
      ...(data.leader && data.leader.relation === '원소속' ? [data.leader.employeeId] : [])
    ]);

    if (originalMemberIds.size > 0) {
      const remainingMembers = node.members.filter(m => !originalMemberIds.has(m.employeeId));
      updateNode(node.id, {
        members: remainingMembers,
      });
    }

    // 새 노드 추가 (신설 조직 색상 적용)
    addNode(node.id, {
      name: data.name,
      level: node.level + 1,
      leader: data.leader ? {
        name: data.leader.name,
        isExecutive: data.leader.employmentType === '임원',
        isConcurrent: data.leader.relation === '겸직',
      } : undefined,
      memberCount: allMembers.length,
      concurrentCount: allMembers.filter(m => m.relation === '겸직').length,
      isExpanded: true,
      color: NEW_NODE_COLOR, // 신설 조직 색상
      members: allMembers,
    });
  }, [node.id, node.level, node.members, addNode, updateNode]);

  // 인원수 표시 (레벨3 이상에서 원소속/겸직 구분)
  // node.memberCount와 node.concurrentCount는 excelParser에서 하위 조직 포함하여 집계된 값
  const getMemberCountDisplay = () => {
    const originalCount = node.memberCount - node.concurrentCount;

    // 레벨2만 합쳐서 표기, 레벨3 이상부터 원소속/겸직 구분
    if (node.level >= 3 && node.concurrentCount > 0) {
      return `${originalCount}/${node.concurrentCount}`;
    }
    return String(node.memberCount);
  };

  // 조직장 이름 표시
  const getLeaderDisplay = () => {
    if (!node.leader) return null;
    const prefix = node.leader.isConcurrent ? '겸)' : '';
    return `${prefix}${node.leader.name}`;
  };

  // 조직명 길이에 따른 폰트 사이즈 계산
  const getNameFontSize = () => {
    const len = node.name.length;
    if (len <= 8) return 'text-sm';
    if (len <= 12) return 'text-xs';
    if (len <= 16) return 'text-[11px]';
    return 'text-[10px]';
  };

  return (
    <div ref={nodeRef} className="flex flex-col items-center">
      {/* 노드 본체 */}
      <div
        ref={(el) => {
          setDragRef(el);
          setDropRef(el);
        }}
        {...(isDragMode ? { ...attributes, ...listeners } : {})}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className={clsx(
          'group relative rounded-lg shadow-node cursor-pointer select-none overflow-hidden',
          'w-[168px] h-[72px]',  // 고정 너비/높이
          'bg-white dark:bg-gray-800',
          // Border: effectiveBorderColor가 있으면 style로 적용, 아니면 기본 border
          !effectiveBorderColor && 'border border-gray-200 dark:border-gray-700',
          // Hover 애니메이션 (드래그 모드가 아닐 때만)
          !isDragMode && 'hover:scale-105 transition-all duration-200',
          // 선택 상태 (액션 버튼 표시 중)
          showActions && 'ring-2 ring-blue-500 animate-neon-pulse',
          // 드래그 모드 - 선택된 조직만 아이폰 스타일 흔들림 + 강조 효과
          isDragMode && isSelected && !isDragging && 'animate-selected-wiggle z-10',
          // 드래그 중인 노드
          isDragging && 'opacity-50 scale-95 z-20',
          // 드롭 대상 (현재 노드 위에 호버 중)
          isOver && isDragMode && !isSelected && 'animate-drop-target',
          // Liquid Glass 효과
          'backdrop-blur-sm'
        )}
        style={{
          // effectiveBorderColor가 있을 때 3px solid border 적용
          // 단, 드롭 대상일 때는 CSS 애니메이션 우선
          ...(effectiveBorderColor && !(isOver && isDragMode && !isSelected) && {
            border: `3px solid ${effectiveBorderColor}`,
            borderRadius: '0.5rem', // rounded-lg와 동일
          }),
        }}
      >
        {/* 조직명 (색상 적용 영역) */}
        <div
          className={clsx(
            'h-[36px] px-3 flex items-center justify-center text-center font-semibold',
            getNameFontSize(),
            getHeaderStyle()
          )}
          style={{
            backgroundColor: getHeaderBgColor(),
            // border가 있을 때는 내부 radius가 더 작아야 함 (8px - 3px = 5px)
            borderTopLeftRadius: effectiveBorderColor ? '5px' : '8px',
            borderTopRightRadius: effectiveBorderColor ? '5px' : '8px',
          }}
        >
          <span className="line-clamp-2">{node.name}</span>
        </div>

        {/* 조직장 및 인원수 - 테이블 형태 */}
        <div className="h-[36px] grid grid-cols-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700">
          {/* 조직장 컬럼 */}
          <div className="px-2 flex items-center justify-center border-r border-gray-100 dark:border-gray-700 truncate">
            {hasLeader ? (
              <span className="truncate">{getLeaderDisplay()}</span>
            ) : (
              <span className="text-red-500 flex items-center justify-center gap-0.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          {/* 인원수 컬럼 */}
          <div className="px-2 flex items-center justify-center">
            <span>{getMemberCountDisplay()}명</span>
          </div>
        </div>

        {/* 펼침/접힘 아이콘 (하위 노드가 있는 경우) - 하단 중앙, floating */}
        {!isLeaf && (
          <div className={clsx(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center',
            'transition-all duration-200',
            'text-gray-400 dark:text-gray-500',
            'group-hover:text-blue-500 dark:group-hover:text-blue-400',
            'drop-shadow-sm',
            node.isExpanded ? 'rotate-180' : 'rotate-0'
          )}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Leaf 노드 팀원 표시 아이콘 - 하단 중앙, floating */}
        {isLeaf && node.members.length > 0 && (
          <div className={clsx(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center',
            'transition-all duration-200',
            'text-gray-400 dark:text-gray-500',
            'group-hover:text-blue-500 dark:group-hover:text-blue-400',
            'drop-shadow-sm',
            showMembers ? 'rotate-180' : 'rotate-0'
          )}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* 팀원 목록 패널 (leaf 노드 클릭 시) */}
      {showMembers && isLeaf && (() => {
        // 사번 KR 시작 + 고용형태 조건으로 필터링
        const filteredMembers = node.members.filter(isCountableEmployee);
        const originalCount = filteredMembers.filter(m => m.relation === '원소속').length;
        const concurrentCount = filteredMembers.filter(m => m.relation === '겸직').length;

        return (
          <div className={clsx(
            'mt-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-3 min-w-[140px]',
            'animate-expand origin-top',
            'dark:bg-gray-800/80 dark:text-white'
          )}>
            <div className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">
              팀원 목록 ({originalCount}/{concurrentCount})
            </div>
            <ul className="space-y-1">
              {[...filteredMembers]
                .sort((a, b) => {
                  // 조직장이 맨 위
                  if (a.isLeader && !b.isLeader) return -1;
                  if (!a.isLeader && b.isLeader) return 1;
                  // 그 외는 한글 가나다 순 정렬
                  return a.name.localeCompare(b.name, 'ko');
                })
                .map((member) => (
                <li
                  key={member.employeeId}
                  className="text-xs text-gray-700 dark:text-gray-200 flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  {member.name}
                  {member.isLeader && (
                    <span className="text-blue-500 text-[10px]">(조직장)</span>
                  )}
                  {member.relation === '겸직' && (
                    <span className="text-orange-500 text-[10px]">(겸)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* 액션 버튼들 (더블클릭 시) */}
      {showActions && !isDragMode && (
        <div className={clsx(
          'flex flex-col gap-1 mt-2 p-2 rounded-lg',
          'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg',
          'animate-expand origin-top'
        )}>
          <div className="flex gap-1">
            <ActionButton
              onClick={() => {
                setDragMode(true);
                setShowActions(false);
              }}
            >
              이동
            </ActionButton>
            <ActionButton onClick={handleEdit}>편집</ActionButton>
          </div>
          <div className="flex gap-1">
            <ActionButton onClick={handleAdd} variant="success">추가</ActionButton>
            <ActionButton onClick={handleDelete} variant="danger">삭제</ActionButton>
          </div>
        </div>
      )}

      {/* 인라인 편집 모드 (중간 노드) */}
      {isEditing && !isLeaf && (
        <div className={clsx(
          'mt-2 p-3 rounded-lg w-[200px]',
          'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
          'animate-expand origin-top'
        )}>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">조직명</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={clsx(
                  'w-full px-2 py-1.5 text-sm rounded border',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-800 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">조직장</label>
              <input
                type="text"
                value={editLeader}
                onChange={(e) => setEditLeader(e.target.value)}
                placeholder="조직장 이름"
                className={clsx(
                  'w-full px-2 py-1.5 text-sm rounded border',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-800 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveInlineEdit();
                  if (e.key === 'Escape') handleCancelInlineEdit();
                }}
              />
            </div>
            {/* 색상 선택 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">노드 색상</label>
              <div className="flex flex-wrap gap-1">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditColor(option.value)}
                    title={option.isDefault ? 'Default (자동)' : option.label}
                    className={clsx(
                      'w-6 h-6 rounded border-2 transition-all',
                      editColor === option.value
                        ? 'border-blue-500 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    )}
                    style={option.isDefault ? {
                      backgroundColor: 'white',
                      backgroundImage: 'linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                    } : option.value === '#FFFFFF' ? {
                      backgroundColor: option.color,
                      border: '2px solid #d1d5db'
                    } : { backgroundColor: option.color }}
                  />
                ))}
                {/* 커스텀 색상들 표시 */}
                {(settings.customColors || []).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setEditColor(color.value)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (confirm(`'${color.label}' 색상을 삭제하시겠습니까?`)) {
                        removeCustomColor(color.value);
                        if (editColor === color.value) {
                          setEditColor('default');
                        }
                      }
                    }}
                    title={`${color.label} (우클릭으로 삭제)`}
                    className={clsx(
                      'w-6 h-6 rounded border-2 transition-all relative',
                      editColor === color.value
                        ? 'border-blue-500 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    )}
                    style={{ backgroundColor: color.value }}
                  >
                    {color.hasBorder && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-white" title="테두리 있음" />
                    )}
                  </button>
                ))}
                {/* 색상 추가 버튼 */}
                <button
                  type="button"
                  onClick={() => setShowCustomColorInput(!showCustomColorInput)}
                  title="색상 추가"
                  className={clsx(
                    'w-6 h-6 rounded border-2 transition-all flex items-center justify-center',
                    'border-dashed border-gray-400 dark:border-gray-500',
                    'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                    showCustomColorInput && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {/* 커스텀 색상 입력 폼 */}
              {showCustomColorInput && (
                <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-700/50 space-y-2">
                  {/* 1행: HEX 입력 | 라벨 입력 */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customColorValue}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val.startsWith('#')) val = '#' + val;
                        setCustomColorValue(val.toUpperCase().slice(0, 7));
                      }}
                      placeholder="#000000"
                      className={clsx(
                        'w-1/2 px-1.5 py-1 text-xs rounded border font-mono',
                        'border-gray-300 dark:border-gray-600',
                        'bg-white dark:bg-gray-700',
                        'text-gray-800 dark:text-white',
                        /^#[0-9A-Fa-f]{6}$/.test(customColorValue) ? '' : 'border-red-400'
                      )}
                    />
                    <input
                      type="text"
                      value={customColorLabel}
                      onChange={(e) => setCustomColorLabel(e.target.value)}
                      placeholder="라벨"
                      className={clsx(
                        'w-1/2 px-1.5 py-1 text-xs rounded border',
                        'border-gray-300 dark:border-gray-600',
                        'bg-white dark:bg-gray-700',
                        'text-gray-800 dark:text-white'
                      )}
                    />
                  </div>
                  {/* 2행: Color Picker | 테두리 체크박스 */}
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={/^#[0-9A-Fa-f]{6}$/.test(customColorValue) ? customColorValue : '#000000'}
                      onChange={(e) => setCustomColorValue(e.target.value.toUpperCase())}
                      className="w-1/2 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                      style={{ padding: 0 }}
                    />
                    <label className="w-1/2 flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      <input
                        type="checkbox"
                        checked={customColorHasBorder}
                        onChange={(e) => setCustomColorHasBorder(e.target.checked)}
                        className="w-3 h-3"
                      />
                      테두리
                    </label>
                  </div>
                  {/* 3행: 추가 버튼 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (customColorLabel.trim() && /^#[0-9A-Fa-f]{6}$/.test(customColorValue)) {
                        addCustomColor({
                          value: customColorValue,
                          label: customColorLabel.trim(),
                          hasBorder: customColorHasBorder,
                        });
                        setEditColor(customColorValue);
                        setCustomColorValue('#000000');
                        setCustomColorLabel('');
                        setCustomColorHasBorder(true);
                        setShowCustomColorInput(false);
                      }
                    }}
                    disabled={!customColorLabel.trim() || !/^#[0-9A-Fa-f]{6}$/.test(customColorValue)}
                    className={clsx(
                      'w-full py-1.5 text-xs rounded font-medium',
                      customColorLabel.trim() && /^#[0-9A-Fa-f]{6}$/.test(customColorValue)
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    추가
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-1 pt-1">
              <button
                onClick={handleCancelInlineEdit}
                className={clsx(
                  'flex-1 px-2 py-1 text-xs rounded',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                )}
              >
                취소
              </button>
              <button
                onClick={handleSaveInlineEdit}
                className={clsx(
                  'flex-1 px-2 py-1 text-xs rounded',
                  'bg-blue-500 hover:bg-blue-600 text-white'
                )}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 편집 다이얼로그 (Leaf 노드) */}
      {showEditDialog && (
        <EditDialog
          node={node}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSave={handleDialogSave}
        />
      )}

      {/* 추가 다이얼로그 */}
      {showAddDialog && (
        <AddNodeDialog
          parentNodeId={node.id}
          parentNodeName={node.name}
          parentMembers={node.members}
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddNodeSave}
        />
      )}

      {/* 삭제 확인 다이얼로그 - Portal로 렌더링 */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelDelete}
          />

          {/* 다이얼로그 */}
          <div className={clsx(
            'relative z-10 w-[360px] rounded-xl shadow-2xl',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'animate-expand origin-center'
          )}>
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                조직 삭제
              </h2>
            </div>

            {/* 본문 */}
            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white mb-2">
                  &apos;{node.name}&apos; 조직을 삭제하시겠습니까?
                </p>
                {node.children.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      하위 조직 {node.children.length}개도 함께 삭제됩니다!
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                )}
                {node.members.length > 0 && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2 text-xs">
                    소속 직원 {node.members.length}명의 정보도 함께 삭제됩니다.
                  </p>
                )}
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancelDelete}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                )}
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-red-500 hover:bg-red-600 text-white'
                )}
              >
                삭제
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// 액션 버튼 컴포넌트
function ActionButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const variantStyles = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
    danger: 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300',
    success: 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-300',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'px-3 py-1.5 rounded text-xs font-medium transition-colors',
        variantStyles[variant]
      )}
    >
      {children}
    </button>
  );
}
