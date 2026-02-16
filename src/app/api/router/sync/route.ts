import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getCurrentUser } from '@/lib/auth';

const PREFS_FILE = join(process.cwd(), 'data', 'model-prefs.json');

/**
 * Sync model routing preferences to a connected OpenClaw workspace
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const { workspacePath, gatewayUrl, gatewayToken } = await request.json();

    // Read current preferences
    let prefs = {};
    if (existsSync(PREFS_FILE)) {
      prefs = JSON.parse(readFileSync(PREFS_FILE, 'utf8'));
    }

    // If workspace path is provided, write directly
    if (workspacePath) {
      const targetPrefsFile = join(workspacePath, 'data', 'superclaw-model-prefs.json');
      const targetDir = dirname(targetPrefsFile);
      
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      
      writeFileSync(targetPrefsFile, JSON.stringify(prefs, null, 2));
      
      return NextResponse.json({
        success: true,
        message: 'Preferences synced to workspace',
        path: targetPrefsFile,
      });
    }

    // If gateway URL is provided, sync via API
    if (gatewayUrl && gatewayToken) {
      // TODO: Implement gateway API sync when OpenClaw supports it
      return NextResponse.json({
        error: 'Gateway sync not yet implemented',
      }, { status: 501 });
    }

    return NextResponse.json({
      error: 'Must provide either workspacePath or gatewayUrl+gatewayToken',
    }, { status: 400 });
  } catch (error) {
    console.error('Error syncing preferences:', error);
    return NextResponse.json({
      error: 'Failed to sync preferences',
    }, { status: 500 });
  }
}

/**
 * Get sync status
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if router is installed in common OpenClaw workspace locations
  const possiblePaths = [
    '/root/clawd/scripts/model-router.js',
    '/root/.openclaw/scripts/model-router.js',
    '/home/mike/clawd/scripts/model-router.js',
  ];

  const installed = possiblePaths.some(p => existsSync(p));
  const installedPath = possiblePaths.find(p => existsSync(p));

  return NextResponse.json({
    installed,
    installedPath,
    possiblePaths,
  });
}
