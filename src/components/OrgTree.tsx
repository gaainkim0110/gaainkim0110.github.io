'use client';

import { useCallback, useRef } from 'react';
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
import { useState } from 'react';

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
  } = useOrgChartStore();

  const [activeNode, setActiveNode] = useState<OrgNodeType | null>(null);

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
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p>조직도 데이터가 없습니다.</p>
          <p className="text-sm mt-2">엑셀 파일을 업로드하거나 새로운 조직도를 생성하세요.</p>
        </div>
      </div>
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
        {/* 드래그 모드 안내 (하단) */}
        {isDragMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span>드래그하여 조직을 이동하세요</span>
            <span className="text-blue-200">|</span>
            <span className="text-sm">ESC로 취소</span>
          </div>
        )}

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
