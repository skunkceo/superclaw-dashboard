import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { getCurrentUser, hasRole } from '@/lib/auth';

// Read workspace path from OpenClaw config, env override, or fallback
async function getWorkspacePath(agentId?: string | null) {
  const homeDir = require('os').homedir();
  let mainWorkspace = process.env.OPENCLAW_WORKSPACE || path.join(homeDir, '.openclaw', 'workspace');

  // Try reading from openclaw.json config
  if (!process.env.OPENCLAW_WORKSPACE) {
    const configCandidates = [
      path.join(homeDir, '.openclaw', 'openclaw.json'),
      '/root/.openclaw/openclaw.json',
    ];
    for (const configPath of configCandidates) {
      try {
        const raw = await readFile(configPath, 'utf-8');
        const config = JSON.parse(raw);
        const configured = config?.agents?.main?.workspace || config?.agents?.defaults?.workspace || config?.workspace;
        if (configured) {
          mainWorkspace = configured;
          break;
        }
      } catch {
        // Try next candidate
      }
    }
  }

  if (agentId) {
    // Agent-specific workspace: check OpenClaw config for agent workspace first
    return path.join(homeDir, '.openclaw', 'workspace', 'agents', agentId);
  }

  return mainWorkspace;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!hasRole(user.role, 'view')) {
    return NextResponse.json({ error: 'View access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent');
    const workspacePath = await getWorkspacePath(agentId);
    
    const files: Array<{ name: string; path: string; size: number; modified: string; isDirectory: boolean }> = [];
    
    // Check for MEMORY.md
    try {
      const memoryPath = path.join(workspacePath, 'MEMORY.md');
      const stats = await stat(memoryPath);
      files.push({
        name: 'MEMORY.md',
        path: 'MEMORY.md',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        isDirectory: false
      });
    } catch {
      // MEMORY.md doesn't exist
    }
    
    // Check for memory/ directory
    try {
      const memoryDirPath = path.join(workspacePath, 'memory');
      const dirStats = await stat(memoryDirPath);
      if (dirStats.isDirectory()) {
        const memoryFiles = await readdir(memoryDirPath);
        for (const file of memoryFiles) {
          if (file.endsWith('.md') || file.endsWith('.json')) {
            const filePath = path.join(memoryDirPath, file);
            const fileStats = await stat(filePath);
            files.push({
              name: file,
              path: `memory/${file}`,
              size: fileStats.size,
              modified: fileStats.mtime.toISOString(),
              isDirectory: false
            });
          }
        }
      }
    } catch {
      // memory/ directory doesn't exist
    }

    // Sort by modified date (newest first)
    files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({
      workspacePath,
      files
    });
  } catch (error) {
    console.error('Error listing memory files:', error);
    return NextResponse.json(
      { error: 'Failed to list memory files' },
      { status: 500 }
    );
  }
}

// Read specific memory file content
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!hasRole(user.role, 'view')) {
    return NextResponse.json({ error: 'View access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent');
    const body = await request.json();
    const { file } = body;
    
    if (!file) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }
    
    // Security: only allow reading from MEMORY.md or memory/ directory
    if (!file.startsWith('memory/') && file !== 'MEMORY.md') {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }
    
    const workspacePath = await getWorkspacePath(agentId);
    const filePath = path.join(workspacePath, file);
    
    const content = await readFile(filePath, 'utf-8');
    const stats = await stat(filePath);
    
    return NextResponse.json({
      filename: file,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (error) {
    console.error('Error reading memory file:', error);
    return NextResponse.json(
      { error: 'Failed to read memory file' },
      { status: 500 }
    );
  }
}
