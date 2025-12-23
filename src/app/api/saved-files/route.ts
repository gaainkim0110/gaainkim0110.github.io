import { NextResponse } from 'next/server';
import { readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const savedDir = path.join(process.cwd(), 'public', 'data', 'saved');

    let files: string[] = [];
    try {
      files = await readdir(savedDir);
    } catch {
      // 디렉토리가 없으면 빈 배열 반환
      return NextResponse.json({ files: [] });
    }

    // JSON 파일만 필터링
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // 각 파일의 메타데이터 읽기
    const fileList = await Promise.all(
      jsonFiles.map(async (fileName) => {
        const filePath = path.join(savedDir, fileName);
        try {
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          const fileStat = await stat(filePath);

          return {
            id: fileName.replace('.json', ''),
            fileName: data.fileName || fileName,
            savedAt: data.savedAt || fileStat.mtime.toISOString(),
            displayName: fileName,
          };
        } catch {
          return null;
        }
      })
    );

    // null 제거 및 최신순 정렬
    const validFiles = fileList
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

    return NextResponse.json({ files: validFiles });
  } catch (error) {
    console.error('List saved files error:', error);
    return NextResponse.json(
      { files: [], error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// 파일 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    const savedDir = path.join(process.cwd(), 'public', 'data', 'saved');
    const filePath = path.join(savedDir, `${fileId}.json`);

    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// 파일 이름 변경
export async function PATCH(request: Request) {
  try {
    const { id, newFileName } = await request.json();

    if (!id || !newFileName) {
      return NextResponse.json(
        { success: false, error: 'ID and new file name are required' },
        { status: 400 }
      );
    }

    const savedDir = path.join(process.cwd(), 'public', 'data', 'saved');
    const filePath = path.join(savedDir, `${id}.json`);

    // 파일 읽기
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // fileName 업데이트
    data.fileName = newFileName;

    // 파일 다시 쓰기
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, fileName: newFileName });
  } catch (error) {
    console.error('Rename file error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rename file' },
      { status: 500 }
    );
  }
}
