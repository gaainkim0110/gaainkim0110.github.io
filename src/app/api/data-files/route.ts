import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');

    let files: string[] = [];
    try {
      files = await readdir(dataDir);
    } catch {
      return NextResponse.json({ files: [] });
    }

    // 엑셀 파일만 필터링 (.xlsx, .xls)
    const excelFiles = files.filter(f =>
      f.endsWith('.xlsx') || f.endsWith('.xls')
    );

    // 각 파일의 메타데이터 생성
    const fileList = await Promise.all(
      excelFiles.map(async (fileName) => {
        const filePath = path.join(dataDir, fileName);
        try {
          const fileStat = await stat(filePath);

          // 파일명에서 설명 추출 (확장자 제외)
          const baseName = fileName.replace(/\.(xlsx|xls)$/i, '');

          return {
            name: fileName,
            description: baseName,
            path: `/data/${fileName}`,
            modifiedAt: fileStat.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      })
    );

    // null 제거 및 최신순 정렬
    const validFiles = fileList
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json({ files: validFiles });
  } catch (error) {
    console.error('List data files error:', error);
    return NextResponse.json(
      { files: [], error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
