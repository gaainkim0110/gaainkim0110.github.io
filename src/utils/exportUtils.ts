import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { OrgNode, Employee } from '@/types';
import { orgTreeToEmployees, employeesToWorkbook } from './excelParser';

// 현재 날짜/시간 형식 문자열 생성
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// PNG로 내보내기
export async function exportToPng(element: HTMLElement, fileName?: string): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = fileName || `org_chart_export_${getTimestamp()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('PNG 내보내기 오류:', error);
    throw new Error('PNG 파일 생성에 실패했습니다.');
  }
}

// PDF로 내보내기
export async function exportToPdf(element: HTMLElement, fileName?: string): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // A4 기준으로 PDF 생성 (가로 방향)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 이미지 비율 유지하면서 페이지에 맞춤
    const imgRatio = img.width / img.height;
    const pageRatio = pageWidth / pageHeight;

    let imgWidth: number;
    let imgHeight: number;

    if (imgRatio > pageRatio) {
      imgWidth = pageWidth - 20; // 여백
      imgHeight = imgWidth / imgRatio;
    } else {
      imgHeight = pageHeight - 20; // 여백
      imgWidth = imgHeight * imgRatio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(fileName || `org_chart_export_${getTimestamp()}.pdf`);
  } catch (error) {
    console.error('PDF 내보내기 오류:', error);
    throw new Error('PDF 파일 생성에 실패했습니다.');
  }
}

// Excel로 내보내기
export function exportToExcel(rootNodes: OrgNode[], fileName?: string): void {
  try {
    const employees = orgTreeToEmployees(rootNodes);
    const workbook = employeesToWorkbook(employees);
    const outputFileName = fileName || `org_chart_export_${getTimestamp()}.xlsx`;
    XLSX.writeFile(workbook, outputFileName);
  } catch (error) {
    console.error('Excel 내보내기 오류:', error);
    throw new Error('Excel 파일 생성에 실패했습니다.');
  }
}

// 내보내기 형식 타입
export type ExportFormat = 'png' | 'pdf' | 'xlsx';

// 통합 내보내기 함수
export async function exportOrgChart(
  format: ExportFormat,
  element: HTMLElement | null,
  rootNodes: OrgNode[],
  fileName?: string
): Promise<void> {
  switch (format) {
    case 'png':
      if (!element) throw new Error('조직도 요소를 찾을 수 없습니다.');
      await exportToPng(element, fileName);
      break;
    case 'pdf':
      if (!element) throw new Error('조직도 요소를 찾을 수 없습니다.');
      await exportToPdf(element, fileName);
      break;
    case 'xlsx':
      exportToExcel(rootNodes, fileName);
      break;
    default:
      throw new Error('지원하지 않는 내보내기 형식입니다.');
  }
}
