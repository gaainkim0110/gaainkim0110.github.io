'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrgChartStore } from '@/store/orgChartStore';
import { parseExcelFile } from '@/utils/excelParser';
import FileUpload from './FileUpload';
import clsx from 'clsx';

interface DataFile {
  name: string;
  description: string;
  path: string;
}

interface SavedFile {
  id: string;
  fileName: string;
  savedAt: string;
  displayName: string;
}

interface WelcomeScreenProps {
  onFileUpload: () => void;
  onNewOrgChart: () => void;
  onError: (errors: string[]) => void;
}

export default function WelcomeScreen({
  onFileUpload,
  onNewOrgChart,
  onError,
}: WelcomeScreenProps) {
  const { cachedFiles, loadFromCache, deleteFromCache, setOrgChart, saveToCache } = useOrgChartStore();
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [loadingSavedFile, setLoadingSavedFile] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');

  // 저장된 파일 목록 가져오기
  const fetchSavedFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/saved-files');
      const data = await response.json();
      setSavedFiles(data.files || []);
    } catch (err) {
      console.log('No saved files found:', err);
    }
  }, []);

  // data 폴더의 파일 목록 가져오기
  useEffect(() => {
    fetch('/data/files.json')
      .then(res => res.json())
      .then(data => {
        setDataFiles(data.files || []);
      })
      .catch(err => {
        console.log('No data files found:', err);
      });

    // 저장된 파일 목록도 가져오기
    fetchSavedFiles();
  }, [fetchSavedFiles]);

  // data 폴더의 파일 로드
  const handleLoadDataFile = async (file: DataFile) => {
    setLoadingFile(file.name);
    try {
      const response = await fetch(file.path);
      if (!response.ok) {
        throw new Error('파일을 불러올 수 없습니다.');
      }

      const blob = await response.blob();
      const excelFile = new File([blob], file.name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(excelFile);

      if (!result.success) {
        onError(result.errors || ['파일 파싱에 실패했습니다.']);
        return;
      }

      setOrgChart({
        employees: result.employees || [],
        rootNodes: result.rootNodes || [],
        fileName: file.name,
        isDirty: false,
      });

      saveToCache(file.name);
      onFileUpload();
    } catch (error) {
      console.error('파일 로드 오류:', error);
      onError([error instanceof Error ? error.message : '파일을 불러오는 중 오류가 발생했습니다.']);
    } finally {
      setLoadingFile(null);
    }
  };

  // 저장된 파일 로드
  const handleLoadSavedFile = async (file: SavedFile) => {
    setLoadingSavedFile(file.id);
    try {
      const response = await fetch(`/api/saved-files/${file.id}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '파일을 불러올 수 없습니다.');
      }

      setOrgChart({
        employees: result.data.employees || [],
        rootNodes: result.data.rootNodes || [],
        fileName: result.data.fileName || file.fileName,
        isDirty: false,
      });

      onFileUpload();
    } catch (error) {
      console.error('저장된 파일 로드 오류:', error);
      onError([error instanceof Error ? error.message : '파일을 불러오는 중 오류가 발생했습니다.']);
    } finally {
      setLoadingSavedFile(null);
    }
  };

  // 저장된 파일 삭제
  const handleDeleteSavedFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!window.confirm('이 저장 파일을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/saved-files?id=${fileId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        fetchSavedFiles();
      } else {
        throw new Error(result.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      onError([error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.']);
    }
  };

  // 파일 이름 변경 시작
  const handleStartRename = (e: React.MouseEvent, file: SavedFile) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditingFileName(file.fileName);
  };

  // 파일 이름 변경 저장
  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!editingFileId || !editingFileName.trim()) return;

    try {
      const response = await fetch('/api/saved-files', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingFileId,
          newFileName: editingFileName.trim(),
        }),
      });
      const result = await response.json();

      if (result.success) {
        fetchSavedFiles();
        setEditingFileId(null);
        setEditingFileName('');
      } else {
        throw new Error(result.error || '이름 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('이름 변경 오류:', error);
      onError([error instanceof Error ? error.message : '이름 변경 중 오류가 발생했습니다.']);
    }
  };

  // 파일 이름 변경 취소
  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(null);
    setEditingFileName('');
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={clsx(
      'min-h-screen pt-20 px-4 pb-8',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:from-gray-900 dark:to-gray-800'
    )}>
      <div className="max-w-4xl mx-auto">
        {/* 환영 메시지 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            조직도 관리 프로그램에 오신 것을 환영합니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            엑셀 파일을 업로드하거나 새로운 조직도를 생성하세요
          </p>
        </div>

        {/* 데이터 파일 목록 */}
        {dataFiles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              엑셀 데이터 파일
            </h3>
            <div className="space-y-2">
              {dataFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => !loadingFile && handleLoadDataFile(file)}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all',
                    'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm',
                    'border border-gray-200/50 dark:border-gray-700/50',
                    'hover:bg-white dark:hover:bg-gray-800 hover:shadow-md',
                    'group',
                    loadingFile === file.name && 'opacity-70 pointer-events-none'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      {loadingFile === file.name ? (
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {file.description}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 저장된 파일 목록 (작업중인 파일) */}
        {savedFiles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              작업중인 파일
            </h3>
            <div className="space-y-2">
              {savedFiles.map((file) => (
                <div
                  key={file.id}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all',
                    'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm',
                    'border border-gray-200/50 dark:border-gray-700/50',
                    'hover:bg-white dark:hover:bg-gray-800 hover:shadow-md',
                    'group',
                    loadingSavedFile === file.id && 'opacity-70 pointer-events-none'
                  )}
                  onClick={() => !loadingSavedFile && editingFileId !== file.id && handleLoadSavedFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      {loadingSavedFile === file.id ? (
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingFileId === file.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingFileName}
                            onChange={(e) => setEditingFileName(e.target.value)}
                            className={clsx(
                              'flex-1 px-2 py-1 text-sm rounded border',
                              'border-purple-300 dark:border-purple-600',
                              'bg-white dark:bg-gray-700',
                              'text-gray-800 dark:text-white',
                              'focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                            )}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(e);
                              if (e.key === 'Escape') {
                                setEditingFileId(null);
                                setEditingFileName('');
                              }
                            }}
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="저장"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="취소"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-gray-800 dark:text-white truncate">
                            {file.fileName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(file.savedAt)} · {file.displayName}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {editingFileId !== file.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleStartRename(e, file)}
                        className={clsx(
                          'opacity-0 group-hover:opacity-100 transition-opacity',
                          'p-2 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        )}
                        title="이름 변경"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSavedFile(e, file.id)}
                        className={clsx(
                          'opacity-0 group-hover:opacity-100 transition-opacity',
                          'p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        )}
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 작업 파일 목록 (캐시) */}
        {cachedFiles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              최근 작업 파일
            </h3>
            <div className="space-y-2">
              {cachedFiles.map((cached) => (
                <div
                  key={cached.id}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all',
                    'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm',
                    'border border-gray-200/50 dark:border-gray-700/50',
                    'hover:bg-white dark:hover:bg-gray-800 hover:shadow-md',
                    'group'
                  )}
                  onClick={() => {
                    loadFromCache(cached.id);
                    onFileUpload();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {cached.fileName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(cached.savedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromCache(cached.id);
                    }}
                    className={clsx(
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      'p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    )}
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 파일 업로드 */}
        <div className="mb-6">
          <FileUpload onSuccess={onFileUpload} onError={onError} />
        </div>

        {/* 새 조직도 생성 버튼 */}
        <button
          onClick={onNewOrgChart}
          className={clsx(
            'w-full p-6 rounded-xl transition-all',
            'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
            'text-white font-semibold text-lg',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center gap-3'
          )}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          새로운 조직도 생성하기
        </button>

        {/* 도움말 */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            엑셀 파일은 지정된 형식을 따라야 합니다.
            <br />
            필수 컬럼: No, 성명, 사번, 부서, 조직코드, 직책, 사원관계, 조직장 여부, 고용형태, 레벨1, 레벨2
          </p>
        </div>
      </div>
    </div>
  );
}
