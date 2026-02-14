import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getCurrentUser, hasRole } from '@/lib/auth';

// Read workspace path from clawdbot config
async function getWorkspacePath() {
  try {
    const configPath = '/root/.clawdbot/clawdbot.json';
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return config.agents?.defaults?.workspace || '/root/clawd';
  } catch {
    // Fallback to default workspace path
    return '/root/clawd';
  }
}

const ALLOWED_FILES = [
  'SOUL.md',
  'USER.md',
  'IDENTITY.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'HEARTBEAT.md'
];

export async function GET() {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check role - need at least 'edit' to view workspace
  if (!hasRole(user.role, 'edit')) {
    return NextResponse.json({ error: 'Edit access required' }, { status: 403 });
  }

  try {
    const workspacePath = await getWorkspacePath();
    
    const files = await Promise.all(
      ALLOWED_FILES.map(async (filename) => {
        try {
          const filePath = path.join(workspacePath, filename);
          await readFile(filePath, 'utf-8');
          return { name: filename, exists: true };
        } catch {
          return { name: filename, exists: false };
        }
      })
    );

    return NextResponse.json({
      workspacePath,
      files
    });
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return NextResponse.json(
      { error: 'Failed to list workspace files' },
      { status: 500 }
    );
  }
}