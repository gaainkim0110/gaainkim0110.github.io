'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { OrgNode as OrgNodeType, Employee } from '@/types';
import { useOrgChartStore } from '@/store/orgChartStore';
import EditDialog from './EditDialog';
import AddNodeDialog, { NEW_NODE_COLOR } from './AddNodeDialog';
import clsx from 'clsx';

// 수정/이동된 노드 색상
const MODIFIED_COLOR = '#419CFF';
// 레벨4 (엑셀 레벨4 = displayLevel 3) 색상
const LEVEL4_COLOR = '#002060';
// 삭제 예정 노드 색상
const DELETED_COLOR = '#000000';
// 인원수 카운트 및 팀원 목록 표시 대상 고용형태
const COUNTABLE_EMPLOYMENT_TYPES = ['임원', '정규_일반직', '정규직'];

// 노드 색상 옵션
const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', color: 'transparent', isDefault: true },
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
  const { selectedNodeId, isDragMode, setSelectedNode, setDragMode, updateNode, addNode, deleteNode } = useOrgChartStore();

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

  // 조직명 행 스타일 결정 (첫번째 행)
  const getHeaderStyle = () => {
    // 삭제 예정 노드는 검정색 배경 + 흰색 텍스트
    if (node.isDeleted) {
      return 'text-white font-nanum-bold rounded-t-lg';
    }
    // 사용자가 직접 설정한 색상이 있으면 우선
    if (node.color) {
      return 'text-white font-nanum-bold rounded-t-lg';
    }
    // 수정/이동된 노드는 파란색 배경 (color가 없는 경우에만)
    if (node.isModified) {
      return 'text-white font-nanum-bold rounded-t-lg';
    }
    if (node.level === 2) {
      return 'bg-node-level2 text-white font-nanum-bold rounded-t-lg';
    }
    // 레벨4 (엑셀 레벨4 = displayLevel 3)
    if (node.level === 3) {
      return 'text-white font-nanum-bold rounded-t-lg';
    }
    // 임원인 경우: ExtraBold 폰트 + 검정색 텍스트
    if (isExecutive) {
      return 'bg-node-executive text-black font-nanum-extrabold rounded-t-lg';
    }
    return 'bg-node-default text-text-primary rounded-t-lg';
  };

  // 조직명 행 배경색
  const getHeaderBgColor = () => {
    // 삭제 예정 노드는 검정색
    if (node.isDeleted) return DELETED_COLOR;
    // 사용자가 직접 설정한 색상이 있으면 우선
    if (node.color) return node.color;
    // 수정/이동된 노드는 파란색 (color가 없는 경우에만)
    if (node.isModified) return MODIFIED_COLOR;
    // 레벨4 (엑셀 레벨4 = displayLevel 3)
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
    const hasChanges = editName !== node.name || editLeader !== (node.leader?.name || '') || newColor !== node.color;

    updateNode(node.id, {
      name: editName,
      leader: editLeader ? {
        name: editLeader,
        isExecutive: node.leader?.isExecutive || false,
        isConcurrent: node.leader?.isConcurrent || false,
      } : undefined,
      color: newColor,
      isModified: hasChanges ? true : node.isModified,
    });
    setIsEditing(false);
  }, [node.id, node.name, node.leader, node.color, editName, editLeader, editColor, updateNode]);

  // 인라인 편집 취소
  const handleCancelInlineEdit = useCallback(() => {
    setEditName(node.name);
    setEditLeader(node.leader?.name || '');
    setEditColor(node.color || 'default');
    setIsEditing(false);
  }, [node.name, node.leader?.name, node.color]);

  // 다이얼로그 저장 (Leaf 노드)
  const handleDialogSave = useCallback((updates: {
    name: string;
    leader?: { name: string; isExecutive: boolean; isConcurrent: boolean };
    members: Employee[];
    color?: string;
  }) => {
    const hasChanges =
      updates.name !== node.name ||
      updates.leader?.name !== node.leader?.name ||
      updates.members.length !== node.members.length ||
      updates.color !== node.color;

    updateNode(node.id, {
      name: updates.name,
      leader: updates.leader,
      members: updates.members,
      memberCount: updates.members.length,
      concurrentCount: updates.members.filter(m => m.relation === '겸직').length,
      color: updates.color || undefined,
      isModified: hasChanges ? true : node.isModified,
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

  // 인원수 표시 (레벨6 이상에서만 원소속/겸직 구분)
  const getMemberCountDisplay = () => {
    // 레벨6 (엑셀 레벨6 = displayLevel 5) 이상에서만 원소속/겸직 구분
    if (node.level >= 5 && node.concurrentCount > 0) {
      const originalCount = node.memberCount - node.concurrentCount;
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
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          // Hover 애니메이션 (드래그 모드가 아닐 때만)
          !isDragMode && 'hover:scale-105 transition-all duration-200',
          // 선택 상태 (액션 버튼 표시 중)
          showActions && 'ring-2 ring-blue-500 animate-neon-pulse',
          // 드래그 모드 - 아이폰 스타일 흔들림
          isDragMode && !isDragging && 'animate-ios-wiggle',
          // 드래그 모드에서 선택된 노드 강조
          isDragMode && isSelected && 'animate-selected-glow z-10',
          // 드래그 중인 노드
          isDragging && 'opacity-50 scale-95 z-20',
          // 드롭 대상 (현재 노드 위에 호버 중)
          isOver && isDragMode && !isSelected && 'animate-drop-target',
          // Liquid Glass 효과
          'backdrop-blur-sm'
        )}
      >
        {/* 조직명 (색상 적용 영역) */}
        <div
          className={clsx(
            'h-[36px] px-3 flex items-center justify-center text-center font-semibold',
            getNameFontSize(),
            getHeaderStyle()
          )}
          style={{ backgroundColor: getHeaderBgColor() }}
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
        // 임원, 정규_일반직, 정규직만 필터링
        const filteredMembers = node.members.filter(m =>
          COUNTABLE_EMPLOYMENT_TYPES.includes(m.employmentType)
        );
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
                    } : { backgroundColor: option.color }}
                  />
                ))}
              </div>
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

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
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
        </div>
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
