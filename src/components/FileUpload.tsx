'use client';

import { useCallback, useRef } from 'react';
import { parseExcelFile } from '@/utils/excelParser';
import { useOrgChartStore } from '@/store/orgChartStore';
import clsx from 'clsx';

interface FileUploadProps {
  onSuccess?: () => void;
  onError?: (errors: string[]) => void;
}

export default function FileUpload({ onSuccess, onError }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setOrgChart, saveToCache } = useOrgChartStore();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 확장자 검증
    const validExtensions = ['.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      onError?.(['지원하지 않는 파일 형식입니다. .xlsx 또는 .xls 파일만 업로드 가능합니다.']);
      return;
    }

    try {
      const result = await parseExcelFile(file);

      if (!result.success) {
        onError?.(result.errors || ['파일 파싱에 실패했습니다.']);
        return;
      }

      // 경고 메시지가 있으면 표시
      if (result.errors && result.errors.length > 0) {
        console.warn('파싱 경고:', result.errors);
      }

      // 상태 업데이트
      setOrgChart({
        employees: result.employees || [],
        rootNodes: result.rootNodes || [],
        fileName: file.name,
        isDirty: false,
      });

      // 캐시에 저장
      saveToCache(file.name);

      onSuccess?.();
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      onError?.([error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.']);
    }

    // 입력 초기화
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [setOrgChart, saveToCache, onSuccess, onError]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputRef.current.files = dataTransfer.files;
      inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={clsx(
        'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all',
        'border-gray-300 hover:border-blue-400 hover:bg-blue-50',
        'dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20',
        // Liquid Glass 효과
        'backdrop-blur-sm bg-white/50 dark:bg-gray-800/50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>

      <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">
        파일 업로드
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        클릭하거나 파일을 드래그하여 업로드하세요
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        지원 형식: .xlsx, .xls
      </p>
    </div>
  );
}
