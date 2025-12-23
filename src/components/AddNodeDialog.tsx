'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Employee } from '@/types';
import clsx from 'clsx';

// 신설 조직 색상
export const NEW_NODE_COLOR = '#FF6861';

interface AddNodeDialogProps {
  parentNodeId: string;
  parentNodeName: string;
  parentMembers: Employee[]; // 상위 조직의 전체 직원 목록
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    orgCode: string;
    leader?: Employee;
    members: Employee[];
    movedMemberIds: string[]; // 상위 조직에서 이동할 직원 ID 목록
  }) => void;
}

type Step = 'info' | 'transfer' | 'members';

interface EmployeeInput {
  name: string;
  employeeId: string;
  position: string;
  relation: '원소속' | '겸직';
  employmentType: '임원' | '정규_일반직';
}

const initialEmployeeInput: EmployeeInput = {
  name: '',
  employeeId: '',
  position: '',
  relation: '원소속',
  employmentType: '정규_일반직',
};

export default function AddNodeDialog({
  parentNodeName,
  parentMembers,
  isOpen,
  onClose,
  onSave,
}: AddNodeDialogProps) {
  const [step, setStep] = useState<Step>('info');

  // Step 1: 기본 정보
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  // Step 2: 상위 조직에서 이동할 직원 선택
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedLeaderIdFromTransfer, setSelectedLeaderIdFromTransfer] = useState<string | null>(null);
  // 이동 직원별 겸직여부 (기본값: 원소속)
  const [memberRelations, setMemberRelations] = useState<Map<string, '원소속' | '겸직'>>(new Map());

  // Step 3: 조직장 & 팀원
  const [leaderInput, setLeaderInput] = useState<EmployeeInput>(initialEmployeeInput);
  const [memberInput, setMemberInput] = useState<EmployeeInput>(initialEmployeeInput);
  const [newMembers, setNewMembers] = useState<Employee[]>([]);

  // 이동 대상 직원 목록 (원소속만)
  const transferableMembers = useMemo(() => {
    return parentMembers.filter(m => m.relation === '원소속');
  }, [parentMembers]);

  // 이동 단계에서 선택된 조직장 정보
  const selectedLeaderFromTransfer = useMemo(() => {
    if (!selectedLeaderIdFromTransfer) return null;
    return parentMembers.find(m => m.employeeId === selectedLeaderIdFromTransfer) || null;
  }, [selectedLeaderIdFromTransfer, parentMembers]);

  // 다이얼로그 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // 초기화
  const handleClose = useCallback(() => {
    setStep('info');
    setOrgName('');
    setOrgCode('');
    setSelectedMemberIds(new Set());
    setSelectedLeaderIdFromTransfer(null);
    setMemberRelations(new Map());
    setLeaderInput(initialEmployeeInput);
    setMemberInput(initialEmployeeInput);
    setNewMembers([]);
    onClose();
  }, [onClose]);

  // 다음 단계
  const handleNext = useCallback(() => {
    if (step === 'info') {
      if (!orgName.trim()) return;
      // 상위 조직에 이동 가능한 직원이 있으면 transfer 단계로
      if (transferableMembers.length > 0) {
        setStep('transfer');
      } else {
        setStep('members');
      }
    } else if (step === 'transfer') {
      setStep('members');
    }
  }, [step, orgName, transferableMembers.length]);

  // 이전 단계
  const handleBack = useCallback(() => {
    if (step === 'members') {
      if (transferableMembers.length > 0) {
        setStep('transfer');
      } else {
        setStep('info');
      }
    } else if (step === 'transfer') {
      setStep('info');
    }
  }, [step, transferableMembers.length]);

  // 직원 선택 토글
  const handleToggleMember = useCallback((employeeId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
        // 조직장으로 선택된 직원이 해제되면 조직장 선택도 해제
        if (selectedLeaderIdFromTransfer === employeeId) {
          setSelectedLeaderIdFromTransfer(null);
        }
        // 겸직여부 설정도 제거
        setMemberRelations(prev => {
          const next = new Map(prev);
          next.delete(employeeId);
          return next;
        });
      } else {
        next.add(employeeId);
        // 기본값: 원소속
        setMemberRelations(prev => {
          const next = new Map(prev);
          next.set(employeeId, '원소속');
          return next;
        });
      }
      return next;
    });
  }, [selectedLeaderIdFromTransfer]);

  // 직원 겸직여부 토글
  const handleToggleMemberRelation = useCallback((employeeId: string) => {
    setMemberRelations(prev => {
      const next = new Map(prev);
      const current = next.get(employeeId) || '원소속';
      next.set(employeeId, current === '원소속' ? '겸직' : '원소속');
      return next;
    });
  }, []);

  // 조직장 선택 토글
  const handleToggleLeader = useCallback((employeeId: string) => {
    if (selectedLeaderIdFromTransfer === employeeId) {
      setSelectedLeaderIdFromTransfer(null);
    } else {
      // 조직장 선택 시 자동으로 이동 대상에도 추가
      setSelectedMemberIds(prev => {
        const next = new Set(prev);
        next.add(employeeId);
        return next;
      });
      // 기본값: 원소속 (없으면 추가)
      setMemberRelations(prev => {
        const next = new Map(prev);
        if (!next.has(employeeId)) {
          next.set(employeeId, '원소속');
        }
        return next;
      });
      setSelectedLeaderIdFromTransfer(employeeId);
    }
  }, [selectedLeaderIdFromTransfer]);

  // 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    if (selectedMemberIds.size === transferableMembers.length) {
      setSelectedMemberIds(new Set());
      setSelectedLeaderIdFromTransfer(null);
      setMemberRelations(new Map());
    } else {
      setSelectedMemberIds(new Set(transferableMembers.map(m => m.employeeId)));
      // 기본값: 원소속
      const newRelations = new Map<string, '원소속' | '겸직'>();
      transferableMembers.forEach(m => newRelations.set(m.employeeId, '원소속'));
      setMemberRelations(newRelations);
    }
  }, [selectedMemberIds.size, transferableMembers]);

  // 새 팀원 추가
  const handleAddMember = useCallback(() => {
    if (!memberInput.name.trim() || !memberInput.employeeId.trim()) return;

    const member: Employee = {
      no: newMembers.length + 1,
      name: memberInput.name.trim(),
      employeeId: memberInput.employeeId.trim(),
      department: orgName,
      orgCode: orgCode,
      position: memberInput.position.trim(),
      relation: memberInput.relation,
      isLeader: false,
      employmentType: memberInput.employmentType === '임원' ? '임원' : '정규직',
      levels: {
        level1: '이사회',
        level2: 'NAVER',
      },
    };

    setNewMembers(prev => [...prev, member]);
    setMemberInput(initialEmployeeInput);
  }, [memberInput, newMembers.length, orgName, orgCode]);

  // 새 팀원 삭제
  const handleRemoveNewMember = useCallback((employeeId: string) => {
    setNewMembers(prev => prev.filter(m => m.employeeId !== employeeId));
  }, []);

  // 저장
  const handleSave = useCallback(() => {
    // 조직장 Employee 결정 (이동 단계에서 선택된 조직장 우선)
    let leader: Employee | undefined;
    if (selectedLeaderFromTransfer) {
      // 이동 단계에서 선택된 조직장 (선택한 겸직여부 적용)
      const leaderRelation = memberRelations.get(selectedLeaderFromTransfer.employeeId) || '원소속';
      leader = {
        ...selectedLeaderFromTransfer,
        department: orgName,
        orgCode: orgCode,
        relation: leaderRelation,
        isLeader: true,
      };
    } else if (leaderInput.name.trim() && leaderInput.employeeId.trim()) {
      // 신규 입력된 조직장
      leader = {
        no: 0,
        name: leaderInput.name.trim(),
        employeeId: leaderInput.employeeId.trim(),
        department: orgName,
        orgCode: orgCode,
        position: leaderInput.position.trim(),
        relation: leaderInput.relation,
        isLeader: true,
        employmentType: leaderInput.employmentType === '임원' ? '임원' : '정규직',
        levels: {
          level1: '이사회',
          level2: 'NAVER',
        },
      };
    }

    // 이동할 직원들을 신설 조직의 멤버로 변환 (조직장 제외, 선택한 겸직여부 적용)
    const movedMembers = parentMembers
      .filter(m => selectedMemberIds.has(m.employeeId) && m.employeeId !== selectedLeaderIdFromTransfer)
      .map(m => ({
        ...m,
        department: orgName,
        orgCode: orgCode,
        relation: memberRelations.get(m.employeeId) || '원소속',
        isLeader: false,
      }));

    onSave({
      name: orgName.trim(),
      orgCode: orgCode.trim(),
      leader,
      members: [...movedMembers, ...newMembers],
      movedMemberIds: Array.from(selectedMemberIds),
    });

    handleClose();
  }, [orgName, orgCode, leaderInput, newMembers, parentMembers, selectedMemberIds, selectedLeaderFromTransfer, selectedLeaderIdFromTransfer, memberRelations, onSave, handleClose]);

  if (!isOpen) return null;

  const totalSteps = transferableMembers.length > 0 ? 3 : 2;
  const currentStep = step === 'info' ? 1 : step === 'transfer' ? 2 : totalSteps;

  // Portal을 사용하여 document.body에 직접 렌더링 (transform 컨테이너 외부)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 다이얼로그 */}
      <div className={clsx(
        'relative z-10 w-full max-w-lg mx-4',
        'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
        'animate-in fade-in zoom-in-95 duration-200'
      )}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              하위 조직 추가
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              상위: {parentNodeName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-900/50">
          <StepIndicator number={1} label="기본 정보" active={step === 'info'} completed={currentStep > 1} />
          {transferableMembers.length > 0 && (
            <>
              <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600" />
              <StepIndicator number={2} label="인원 이동" active={step === 'transfer'} completed={currentStep > 2} />
            </>
          )}
          <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <StepIndicator number={totalSteps} label="신규 등록" active={step === 'members'} completed={false} />
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
          {step === 'info' && (
            // Step 1: 기본 정보
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  부서명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="예: 개발1팀"
                  className={clsx(
                    'w-full px-3 py-2 rounded-lg border',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700',
                    'text-gray-800 dark:text-white',
                    'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'transition-colors'
                  )}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  조직코드
                </label>
                <input
                  type="text"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  placeholder="예: DEV001"
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
              {/* 노드 색상 미리보기 */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                <span
                  className="w-5 h-5 rounded border border-gray-300"
                  style={{ backgroundColor: NEW_NODE_COLOR }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  신설 조직 색상이 적용됩니다
                </span>
              </div>
            </div>
          )}

          {step === 'transfer' && (
            // Step 2: 상위 조직에서 이동할 직원 선택
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {parentNodeName}에서 이동할 직원을 선택하세요
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  {selectedMemberIds.size === transferableMembers.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transferableMembers.map((member) => {
                  const isSelected = selectedMemberIds.has(member.employeeId);
                  const relation = memberRelations.get(member.employeeId) || '원소속';
                  return (
                    <div
                      key={member.employeeId}
                      className={clsx(
                        'flex flex-col gap-2 px-3 py-2 rounded-lg transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* 이동 선택 체크박스 */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMember(member.employeeId)}
                          className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        {/* 직원 정보 */}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {member.name}
                          </span>
                          <span className="text-xs text-gray-500">({member.employeeId})</span>
                          {member.position && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {member.position}
                            </span>
                          )}
                          {member.isLeader && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              기존 조직장
                            </span>
                          )}
                        </div>
                        {/* 조직장 지정 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleToggleLeader(member.employeeId)}
                          className={clsx(
                            'px-2 py-1 rounded text-xs font-medium transition-colors',
                            selectedLeaderIdFromTransfer === member.employeeId
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                          )}
                        >
                          {selectedLeaderIdFromTransfer === member.employeeId ? '★ 조직장' : '조직장 지정'}
                        </button>
                      </div>
                      {/* 겸직여부 선택 (선택된 경우에만 표시) */}
                      {isSelected && (
                        <div className="flex items-center gap-2 ml-7">
                          <span className="text-xs text-gray-500 dark:text-gray-400">이동 후 소속:</span>
                          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberRelation(member.employeeId)}
                              className={clsx(
                                'px-2 py-0.5 text-xs font-medium transition-colors',
                                relation === '원소속'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              )}
                            >
                              원소속
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMemberRelation(member.employeeId)}
                              className={clsx(
                                'px-2 py-0.5 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
                                relation === '겸직'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              )}
                            >
                              겸직
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-sm">
                {selectedMemberIds.size > 0 && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    {selectedMemberIds.size}명 선택됨
                  </p>
                )}
                {selectedLeaderFromTransfer && (
                  <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ★ 조직장: {selectedLeaderFromTransfer.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'members' && (
            // Step 3: 인원 등록
            <div className="space-y-5">
              {/* 이동된 직원 표시 (조직장 제외) */}
              {selectedMemberIds.size > 0 && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <h4 className="text-xs font-bold text-green-700 dark:text-green-300 mb-2">
                    이동 예정 ({selectedMemberIds.size - (selectedLeaderFromTransfer ? 1 : 0)}명)
                    {selectedLeaderFromTransfer && ' + 조직장 1명'}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {parentMembers
                      .filter(m => selectedMemberIds.has(m.employeeId) && m.employeeId !== selectedLeaderIdFromTransfer)
                      .map(m => {
                        const relation = memberRelations.get(m.employeeId) || '원소속';
                        return (
                          <span
                            key={m.employeeId}
                            className={clsx(
                              'text-xs px-2 py-0.5 rounded',
                              relation === '겸직'
                                ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
                                : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
                            )}
                          >
                            {m.name}{relation === '겸직' && ' (겸)'}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 조직장 섹션 */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  조직장
                </h3>
                {selectedLeaderFromTransfer ? (
                  // 이동 단계에서 조직장이 선택된 경우
                  (() => {
                    const leaderRelation = memberRelations.get(selectedLeaderFromTransfer.employeeId) || '원소속';
                    return (
                      <div className="flex items-center gap-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                        <span className="text-yellow-500 text-lg">★</span>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {selectedLeaderFromTransfer.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">({selectedLeaderFromTransfer.employeeId})</span>
                          {selectedLeaderFromTransfer.position && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded ml-2">
                              {selectedLeaderFromTransfer.position}
                            </span>
                          )}
                          {leaderRelation === '겸직' && (
                            <span className="text-xs bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded ml-2">
                              겸직
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          상위 조직에서 이동
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  // 신규 입력
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      신규 조직장 정보를 입력하세요 (선택)
                    </p>
                    <EmployeeInputForm
                      value={leaderInput}
                      onChange={setLeaderInput}
                      placeholder="조직장"
                    />
                  </>
                )}
              </div>

              {/* 신규 팀원 섹션 */}
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  신규 팀원 ({newMembers.length}명)
                </h3>

                {/* 신규 팀원 목록 */}
                {newMembers.length > 0 && (
                  <div className="mb-3 space-y-2 max-h-24 overflow-y-auto">
                    {newMembers.map((member) => (
                      <div
                        key={member.employeeId}
                        className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-800 dark:text-white">{member.name}</span>
                          <span className="text-xs text-gray-500">({member.employeeId})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveNewMember(member.employeeId)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 팀원 입력 폼 */}
                <EmployeeInputForm
                  value={memberInput}
                  onChange={setMemberInput}
                  placeholder="팀원"
                />
                <button
                  onClick={handleAddMember}
                  disabled={!memberInput.name.trim() || !memberInput.employeeId.trim()}
                  className={clsx(
                    'mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    memberInput.name.trim() && memberInput.employeeId.trim()
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                  )}
                >
                  팀원 추가
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {step === 'info' ? (
            <>
              <button
                onClick={handleClose}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                )}
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!orgName.trim()}
                className={clsx(
                  'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                  orgName.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                )}
              >
                다음
              </button>
            </>
          ) : step === 'transfer' ? (
            <>
              <button
                onClick={handleBack}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                )}
              >
                이전
              </button>
              <button
                onClick={handleNext}
                className={clsx(
                  'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-blue-500 hover:bg-blue-600 text-white'
                )}
              >
                다음
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                )}
              >
                이전
              </button>
              <button
                onClick={handleSave}
                className={clsx(
                  'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-green-500 hover:bg-green-600 text-white'
                )}
              >
                저장
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// 스텝 인디케이터 컴포넌트
function StepIndicator({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-1.5',
      active ? 'text-blue-600 dark:text-blue-400' : completed ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
    )}>
      <span className={clsx(
        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
        active ? 'bg-blue-600 text-white' : completed ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
      )}>
        {completed ? '✓' : number}
      </span>
      <span className="text-xs font-medium hidden sm:inline">{label}</span>
    </div>
  );
}

// 직원 입력 폼 컴포넌트
function EmployeeInputForm({
  value,
  onChange,
  placeholder,
}: {
  value: EmployeeInput;
  onChange: (value: EmployeeInput) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {/* 1행: 성명, 사번 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={`${placeholder} 성명`}
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
          value={value.employeeId}
          onChange={(e) => onChange({ ...value, employeeId: e.target.value })}
          placeholder="사번"
          className={clsx(
            'w-24 px-3 py-2 rounded-lg border text-sm',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-700',
            'text-gray-800 dark:text-white',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          )}
        />
      </div>

      {/* 2행: 직책 */}
      <input
        type="text"
        value={value.position}
        onChange={(e) => onChange({ ...value, position: e.target.value })}
        placeholder="직책 (예: 팀장, 수석)"
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm',
          'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-700',
          'text-gray-800 dark:text-white',
          'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        )}
      />

      {/* 3행: 사원관계, 고용형태 */}
      <div className="flex gap-2">
        {/* 사원관계 토글 */}
        <div className="flex-1 flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ ...value, relation: '원소속' })}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors',
              value.relation === '원소속'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            )}
          >
            원소속
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, relation: '겸직' })}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
              value.relation === '겸직'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            )}
          >
            겸직
          </button>
        </div>

        {/* 고용형태 토글 */}
        <div className="flex-1 flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ ...value, employmentType: '정규_일반직' })}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors',
              value.employmentType === '정규_일반직'
                ? 'bg-green-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            )}
          >
            정규
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, employmentType: '임원' })}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
              value.employmentType === '임원'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            )}
          >
            임원
          </button>
        </div>
      </div>
    </div>
  );
}
