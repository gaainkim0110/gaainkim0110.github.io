'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OrgNode, Employee } from '@/types';
import clsx from 'clsx';

// 노드 색상 옵션
const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', color: 'transparent', isDefault: true },
  { value: '#70AD47', label: '레벨2', color: '#70AD47', isDefault: false },
  { value: '#002060', label: '레벨4', color: '#002060', isDefault: false },
  { value: '#419CFF', label: '수정', color: '#419CFF', isDefault: false },
  { value: '#AAAAAA', label: '임원', color: '#AAAAAA', isDefault: false },
  { value: '#000000', label: '폐지', color: '#000000', isDefault: false },
] as const;

interface EditDialogProps {
  node: OrgNode;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    leader?: { name: string; isExecutive: boolean; isConcurrent: boolean };
    members: Employee[];
    color?: string;
  }) => void;
}

export default function EditDialog({ node, isOpen, onClose, onSave }: EditDialogProps) {
  const [orgName, setOrgName] = useState(node.name);
  const [leaderName, setLeaderName] = useState(node.leader?.name || '');
  const [members, setMembers] = useState<Employee[]>([...node.members]);
  const [nodeColor, setNodeColor] = useState(node.color || 'default');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState<'원소속' | '겸직'>('원소속');

  // node가 변경되면 상태 업데이트
  useEffect(() => {
    setOrgName(node.name);
    setLeaderName(node.leader?.name || '');
    setMembers([...node.members]);
    setNodeColor(node.color || 'default');
  }, [node]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 팀원 삭제
  const handleRemoveMember = useCallback((employeeId: string) => {
    setMembers(prev => prev.filter(m => m.employeeId !== employeeId));
  }, []);

  // 팀원 추가
  const handleAddMember = useCallback(() => {
    if (!newMemberName.trim() || !newMemberId.trim()) return;

    const newMember: Employee = {
      no: members.length + 1,
      name: newMemberName.trim(),
      employeeId: newMemberId.trim(),
      department: node.name,
      orgCode: '',
      position: '',
      relation: newMemberRelation,
      isLeader: false,
      employmentType: '정규직',
      levels: {
        level1: '이사회',
        level2: 'NAVER',
      },
    };

    setMembers(prev => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberId('');
    setNewMemberRelation('원소속');
  }, [newMemberName, newMemberId, newMemberRelation, members.length, node.name]);

  // 조직장 지정/해제
  const handleToggleLeader = useCallback((employeeId: string) => {
    setMembers(prev => prev.map(m => ({
      ...m,
      isLeader: m.employeeId === employeeId ? !m.isLeader : false,
    })));
    const member = members.find(m => m.employeeId === employeeId);
    if (member && !member.isLeader) {
      setLeaderName(member.name);
    } else {
      setLeaderName('');
    }
  }, [members]);

  // 저장
  const handleSave = useCallback(() => {
    const leaderMember = members.find(m => m.isLeader);
    // 'default' 선택 시 color를 undefined로 설정하여 기존 우선순위 적용
    const newColor = nodeColor === 'default' ? undefined : nodeColor;
    onSave({
      name: orgName,
      leader: leaderName ? {
        name: leaderName,
        isExecutive: leaderMember?.employmentType === '임원' || false,
        isConcurrent: leaderMember?.relation === '겸직' || false,
      } : undefined,
      members,
      color: newColor,
    });
    onClose();
  }, [orgName, leaderName, members, nodeColor, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 다이얼로그 */}
      <div className={clsx(
        'relative z-10 w-full max-w-lg mx-4',
        'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
        'animate-in fade-in zoom-in-95 duration-200'
      )}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            조직 편집
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* 조직명 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              조직명
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className={clsx(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-700',
                'text-gray-800 dark:text-white',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'transition-colors'
              )}
            />
          </div>

          {/* 조직장 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              조직장
            </label>
            <input
              type="text"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              placeholder="조직장 이름"
              className={clsx(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-700',
                'text-gray-800 dark:text-white',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'transition-colors'
              )}
            />
          </div>

          {/* 팀원 목록 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              팀원 목록 ({members.length}명)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  팀원이 없습니다.
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.employeeId}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 rounded-lg',
                      'bg-gray-50 dark:bg-gray-700/50',
                      member.isLeader && 'ring-2 ring-blue-500'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800 dark:text-white">
                        {member.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({member.employeeId})
                      </span>
                      {member.isLeader && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">
                          조직장
                        </span>
                      )}
                      {member.relation === '겸직' && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded">
                          겸직
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleLeader(member.employeeId)}
                        className={clsx(
                          'p-1 rounded text-xs transition-colors',
                          member.isLeader
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                        )}
                        title={member.isLeader ? '조직장 해제' : '조직장 지정'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.employeeId)}
                        className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 팀원 추가 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              팀원 추가
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="이름"
                className={clsx(
                  'flex-1 px-3 py-2 rounded-lg border text-sm',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-800 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              />
              <input
                type="text"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                placeholder="사번"
                className={clsx(
                  'w-20 px-3 py-2 rounded-lg border text-sm',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-800 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              />
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNewMemberRelation('원소속')}
                  className={clsx(
                    'px-2 py-2 text-xs font-medium transition-colors',
                    newMemberRelation === '원소속'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  )}
                >
                  원소속
                </button>
                <button
                  type="button"
                  onClick={() => setNewMemberRelation('겸직')}
                  className={clsx(
                    'px-2 py-2 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
                    newMemberRelation === '겸직'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  )}
                >
                  겸직
                </button>
              </div>
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim() || !newMemberId.trim()}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  newMemberName.trim() && newMemberId.trim()
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                )}
              >
                추가
              </button>
            </div>
          </div>

          {/* 노드 색상 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              노드 색상
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNodeColor(option.value)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all',
                    nodeColor === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <span
                    className="w-5 h-5 rounded border border-gray-300 dark:border-gray-500"
                    style={option.isDefault ? {
                      backgroundColor: 'white',
                      backgroundImage: 'linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                    } : { backgroundColor: option.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {option.isDefault ? 'Default (자동)' : option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-gray-100 hover:bg-gray-200 text-gray-700',
              'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            )}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-blue-500 hover:bg-blue-600 text-white'
            )}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
