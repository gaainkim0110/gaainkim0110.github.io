'use client';

import clsx from 'clsx';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: ZoomControlsProps) {
  return (
    <div className={clsx(
      'fixed bottom-6 left-6 z-40',
      'flex items-center gap-2 p-2 rounded-xl',
      'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm',
      'border border-gray-200/50 dark:border-gray-700/50',
      'shadow-lg'
    )}>
      <button
        onClick={onZoomOut}
        className={clsx(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
        )}
        title="축소"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      <span className="w-14 text-center text-sm font-medium text-gray-700 dark:text-gray-200">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={onZoomIn}
        className={clsx(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
        )}
        title="확대"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        onClick={onFit}
        className={clsx(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
        )}
        title="화면에 맞춤"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <button
        onClick={onReset}
        className={clsx(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
        )}
        title="초기화"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
