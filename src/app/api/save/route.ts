import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 현재 날짜/시간으로 파일명 생성 (YYYYMMDD_HHmmss) - Asia/Seoul 시간대
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');
    const seconds = String(koreaTime.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    const fileName = `orgchart_${timestamp}.json`;
    const savedDir = path.join(process.cwd(), 'public', 'data', 'saved');
    const filePath = path.join(savedDir, fileName);

    // 디렉토리가 없으면 생성
    await mkdir(savedDir, { recursive: true });

    // 저장할 데이터 구조
    const saveData = {
      savedAt: now.toISOString(),
      fileName: data.fileName || 'untitled',
      orgChartState: {
        rootNodes: data.rootNodes,
        employees: data.employees,
        lastImportDate: data.lastImportDate,
        isDirty: false,
        fileName: data.fileName,
      },
    };

    // 파일 저장
    await writeFile(filePath, JSON.stringify(saveData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      fileName,
      savedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
