'use client';

import { useEffect, useState } from 'react';
import { useOrgChartStore } from '@/store/orgChartStore';
import { parseExcelFile } from '@/utils/excelParser';
import FileUpload from './FileUpload';
import clsx from 'clsx';

interface DataFile {
  name: string;
  description: string;
  path: string;
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
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

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
  }, []);

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

        {/* 최근 작업 파일 목록 */}
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
