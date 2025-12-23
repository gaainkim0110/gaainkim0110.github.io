'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useOrgChartStore } from '@/store/orgChartStore';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import OrgTree from '@/components/OrgTree';
import ZoomControls from '@/components/ZoomControls';
import clsx from 'clsx';

type ViewMode = 'welcome' | 'chart' | 'editor';

export default function Home() {
  const { rootNodes, reset } = useOrgChartStore();
  const [viewMode, setViewMode] = useState<ViewMode>('welcome');
  const [zoom, setZoom] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 조직도 데이터가 있으면 차트 뷰로 전환
  useEffect(() => {
    if (rootNodes.length > 0 && viewMode === 'welcome') {
      setViewMode('chart');
    }
  }, [rootNodes, viewMode]);

  // 파일 업로드 성공
  const handleFileUploadSuccess = useCallback(() => {
    setViewMode('chart');
    setShowImportModal(false);
    setErrors([]);
  }, []);

  // 새 조직도 생성
  const handleNewOrgChart = useCallback(() => {
    reset();
    setViewMode('editor');
    setErrors([]);
  }, [reset]);

  // 에러 처리
  const handleError = useCallback((newErrors: string[]) => {
    setErrors(newErrors);
  }, []);

  // Import 버튼 클릭
  const handleImportClick = useCallback(() => {
    if (viewMode === 'chart') {
      setShowImportModal(true);
    } else {
      setViewMode('welcome');
    }
  }, [viewMode]);

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
  }, []);

  const handleFit = useCallback(() => {
    setZoom(1);
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
  }, []);

  // ESC 키로 드래그 모드 취소
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useOrgChartStore.getState().setDragMode(false);
        useOrgChartStore.getState().setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header onImport={handleImportClick} />

      {/* 에러 알림 */}
      {errors.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full mx-4">
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 dark:text-red-200">오류 발생</h4>
                <ul className="mt-1 text-sm text-red-700 dark:text-red-300 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setErrors([])}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {viewMode === 'welcome' ? (
        <WelcomeScreen
          onFileUpload={handleFileUploadSuccess}
          onNewOrgChart={handleNewOrgChart}
          onError={handleError}
        />
      ) : (
        <div className="pt-16 h-screen flex flex-col">
          {/* 조직도 컨테이너 */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <OrgTree />
          </div>

          {/* 줌 컨트롤 */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Import 모달 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={clsx(
            'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4',
            'animate-in fade-in zoom-in duration-200'
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                파일 가져오기
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              새 파일을 가져오면 현재 작업 중인 조직도가 대체됩니다.
            </p>

            <WelcomeScreen
              onFileUpload={handleFileUploadSuccess}
              onNewOrgChart={() => {
                setShowImportModal(false);
                handleNewOrgChart();
              }}
              onError={handleError}
            />
          </div>
        </div>
      )}
    </main>
  );
}
