'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import type { OrgNode as OrgNodeType } from '@/types';
import { useOrgChartStore } from '@/store/orgChartStore';
import OrgNode from './OrgNode';
import clsx from 'clsx';

interface OrgTreeProps {
  className?: string;
}

export default function OrgTree({ className }: OrgTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    rootNodes,
    toggleNodeExpand,
    moveNode,
    isDragMode,
    setDragMode,
    setRootNodes,
  } = useOrgChartStore();

  const [activeNode, setActiveNode] = useState<OrgNodeType | null>(null);
  const [showAddFirstNode, setShowAddFirstNode] = useState(false);
  const [firstNodeName, setFirstNodeName] = useState('');
  const [firstNodeLeader, setFirstNodeLeader] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트 마운트 확인 (Portal 사용을 위해)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 첫 노드 추가 핸들러
  const handleAddFirstNode = useCallback(() => {
    if (!firstNodeName.trim()) return;

    const newNode: OrgNodeType = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: firstNodeName.trim(),
      level: 2,
      leader: firstNodeLeader.trim() ? {
        name: firstNodeLeader.trim(),
        isExecutive: false,
        isConcurrent: false,
      } : undefined,
      memberCount: 0,
      concurrentCount: 0,
      members: [],
      children: [],
      isExpanded: true,
    };

    setRootNodes([newNode]);
    setShowAddFirstNode(false);
    setFirstNodeName('');
    setFirstNodeLeader('');
  }, [firstNodeName, firstNodeLeader, setRootNodes]);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // 드래그 시작
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const node = active.data.current?.node as OrgNodeType;
    if (node) {
      setActiveNode(node);
    }
  }, []);

  // 드래그 종료
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNode(null);
    setDragMode(false);

    if (!over) return;

    const draggedNodeId = active.id as string;
    const targetNodeId = (over.id as string).replace('drop-', '');

    if (draggedNodeId === targetNodeId) return;

    // 이동 확인 다이얼로그
    const confirmMove = window.confirm('선택한 조직을 이동하시겠습니까?');
    if (confirmMove) {
      moveNode(draggedNodeId, targetNodeId);
    }
  }, [moveNode, setDragMode]);

  // 노드 토글
  const handleToggle = useCallback((nodeId: string) => {
    toggleNodeExpand(nodeId);
  }, [toggleNodeExpand]);

  if (rootNodes.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full p-8">
          {/* 첫 노드 추가 버튼 - 기존 노드 크기와 동일 (168x72) */}
          <button
            onClick={() => setShowAddFirstNode(true)}
            className={clsx(
              'w-[168px] h-[72px] rounded-lg',
              'border-2 border-dashed border-gray-300 dark:border-gray-600',
              'hover:border-blue-400 dark:hover:border-blue-500',
              'hover:bg-blue-50 dark:hover:bg-blue-900/20',
              'transition-all duration-200',
              'flex flex-col items-center justify-center gap-1',
              'text-gray-400 dark:text-gray-500',
              'hover:text-blue-500 dark:hover:text-blue-400',
              'cursor-pointer'
            )}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">첫 노드 추가하기</span>
          </button>
        </div>

        {/* 첫 노드 추가 다이얼로그 */}
        {showAddFirstNode && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 배경 오버레이 */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAddFirstNode(false)}
            />

            {/* 다이얼로그 */}
            <div className={clsx(
              'relative z-10 w-full max-w-sm mx-4',
              'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
              'animate-in fade-in zoom-in-95 duration-200'
            )}>
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  첫 조직 추가
                </h2>
                <button
                  onClick={() => setShowAddFirstNode(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 본문 */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    조직명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstNodeName}
                    onChange={(e) => setFirstNodeName(e.target.value)}
                    placeholder="예: NAVER"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg border',
                      'border-gray-300 dark:border-gray-600',
                      'bg-white dark:bg-gray-700',
                      'text-gray-800 dark:text-white',
                      'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'transition-colors'
                    )}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && firstNodeName.trim()) {
                        handleAddFirstNode();
                      }
                      if (e.key === 'Escape') {
                        setShowAddFirstNode(false);
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    조직장
                  </label>
                  <input
                    type="text"
                    value={firstNodeLeader}
                    onChange={(e) => setFirstNodeLeader(e.target.value)}
                    placeholder="조직장 이름 (선택)"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg border',
                      'border-gray-300 dark:border-gray-600',
                      'bg-white dark:bg-gray-700',
                      'text-gray-800 dark:text-white',
                      'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'transition-colors'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && firstNodeName.trim()) {
                        handleAddFirstNode();
                      }
                      if (e.key === 'Escape') {
                        setShowAddFirstNode(false);
                      }
                    }}
                  />
                </div>
              </div>

              {/* 푸터 */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAddFirstNode(false)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    'bg-gray-100 hover:bg-gray-200 text-gray-700',
                    'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                  )}
                >
                  취소
                </button>
                <button
                  onClick={handleAddFirstNode}
                  disabled={!firstNodeName.trim()}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    firstNodeName.trim()
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                  )}
                >
                  추가
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        id="org-chart-container"
        className={clsx(
          'w-full h-full overflow-auto p-8',
          className
        )}
      >
        {/* 조직도 트리 */}
        <ul className="tree-container flex flex-col items-center">
          {rootNodes.map((rootNode) => (
            <OrgTreeNode
              key={rootNode.id}
              node={rootNode}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {activeNode && (
          <div className="opacity-80 scale-95">
            <OrgNode node={activeNode} />
          </div>
        )}
      </DragOverlay>

      {/* 드래그 모드 안내 (브라우저 하단 - Portal로 document.body에 렌더링) */}
      {isDragMode && isMounted && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          <span>드래그하여 조직을 이동하세요</span>
          <span className="text-blue-200">|</span>
          <span className="text-sm">ESC로 취소</span>
        </div>,
        document.body
      )}
    </DndContext>
  );
}

// 조직 트리 노드 (재귀 컴포넌트)
interface OrgTreeNodeProps {
  node: OrgNodeType;
  onToggle: (nodeId: string) => void;
}

function OrgTreeNode({ node, onToggle }: OrgTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const showChildren = hasChildren && node.isExpanded;

  return (
    <li className="tree-node relative flex flex-col items-center">
      {/* 현재 노드 */}
      <OrgNode node={node} onToggle={onToggle} />

      {/* 하위 노드들 */}
      {showChildren && (
        <>
          {/* 부모에서 자식들로 내려가는 수직 연결선 */}
          <div className="tree-vertical-line w-0.5 h-5 bg-gray-300 dark:bg-gray-600" />
          <ul className="tree-children relative flex justify-center animate-expand origin-top">
            {node.children.map((child) => (
              <OrgTreeNode
                key={child.id}
                node={child}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}
