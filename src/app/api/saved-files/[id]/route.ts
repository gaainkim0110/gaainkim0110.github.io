import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const savedDir = path.join(process.cwd(), 'public', 'data', 'saved');
    const filePath = path.join(savedDir, `${id}.json`);

    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    return NextResponse.json({
      success: true,
      data: data.orgChartState,
    });
  } catch (error) {
    console.error('Load saved file error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load file' },
      { status: 500 }
    );
  }
}
