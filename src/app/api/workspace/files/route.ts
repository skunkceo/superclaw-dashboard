import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
  }

  try {
    const workspaceRoot = '/root/clawd';
    const filePath = join(workspaceRoot, path);

    // Security: ensure path is within workspace
    if (!filePath.startsWith(workspaceRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    const content = await readFile(filePath, 'utf8');
    return NextResponse.json({ content, path });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('Failed to read workspace file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
