'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrgChartStore } from '@/store/orgChartStore';
import { exportOrgChart, ExportFormat } from '@/utils/exportUtils';
import ThemeToggle from './ThemeToggle';
import clsx from 'clsx';

interface HeaderProps {
  onImport?: () => void;
  isSaving?: boolean;
  onSave?: () => void;
  onHome?: () => void;
  viewMode?: 'welcome' | 'chart' | 'editor';
}

export default function Header({ onImport, isSaving = false, onSave, onHome, viewMode = 'welcome' }: HeaderProps) {
  const { rootNodes, fileName, isDirty, expandAllNodes, collapseAllNodes } = useOrgChartStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // welcome 모드에서는 데이터가 있어도 첫 화면처럼 표시
  const hasData = rootNodes.length > 0 && viewMode !== 'welcome';

  const handleExport = async (format: ExportFormat) => {
    setShowExportMenu(false);
    setIsExporting(true);

    try {
      const element = document.getElementById('org-chart-container');
      await exportOrgChart(format, element, rootNodes);
    } catch (error) {
      console.error('Export 오류:', error);
      alert(error instanceof Error ? error.message : '내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 h-16',
      'backdrop-blur-glass bg-white/70 dark:bg-gray-900/70',
      'border-b border-gray-200/50 dark:border-gray-700/50',
      'shadow-sm'
    )}>
      <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
        {/* 로고 및 타이틀 */}
        <div className="flex items-center gap-3">
          {/* 클릭 가능한 로고 + 타이틀 영역 */}
          <div
            onClick={onHome}
            className={clsx(
              'flex items-center gap-3 cursor-pointer',
              'hover:opacity-80 transition-opacity'
            )}
            title="첫 화면으로"
          >
            <img
              src="/favicon-32.png"
              alt="Logo"
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                조직도 관리 프로그램
              </h1>
              {fileName && viewMode !== 'welcome' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  {fileName}
                  {isDirty && <span className="text-orange-500">*</span>}
                </p>
              )}
            </div>
          </div>

          {/* 저장 버튼 - 로고 옆에 배치 */}
          {hasData && (
            <>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />
              <button
                onClick={onSave}
                disabled={isSaving}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm',
                  'bg-purple-500 hover:bg-purple-600 text-white',
                  'shadow-sm hover:shadow-md',
                  isSaving && 'opacity-70 cursor-wait'
                )}
                title="저장하기 (Ctrl+S)"
              >
                {isSaving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                저장
                <span className="text-purple-200 text-xs hidden sm:inline">⌘S</span>
              </button>
            </>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 펼침/접힘 버튼 */}
          {hasData && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={expandAllNodes}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded-lg transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200'
                )}
                title="모두 펼치기"
              >
                모두 펼치기
              </button>
              <button
                onClick={collapseAllNodes}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded-lg transition-colors',
                  'bg-gray-100 hover:bg-gray-200 text-gray-700',
                  'dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200'
                )}
                title="모두 접기"
              >
                모두 접기
              </button>
            </div>
          )}

          {/* Import 버튼 */}
          <button
            onClick={onImport}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'shadow-sm hover:shadow-md'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>

          {/* Export 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!hasData || isExporting}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                hasData
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              )}
            >
              {isExporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Export 드롭다운 메뉴 */}
            {showExportMenu && hasData && (
              <div className={clsx(
                'absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700'
              )}>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center text-green-600 dark:text-green-400 text-xs font-bold">
                    XLS
                  </span>
                  Excel 파일 (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('png')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                    PNG
                  </span>
                  이미지 파일 (.png)
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                    PDF
                  </span>
                  PDF 파일 (.pdf)
                </button>
              </div>
            )}
          </div>

          {/* 테마 토글 */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
