import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import { getCurrentUser, hasRole } from '@/lib/auth';

// Read workspace path from clawdbot config or agent-specific path
async function getWorkspacePath(agentId?: string | null) {
  // Agent-specific workspace
  if (agentId) {
    return `/root/.superclaw/agents/${agentId}/workspace`;
  }
  
  // Main workspace
  try {
    const configPaths = ['/root/.openclaw/openclaw.json', '/root/.clawdbot/clawdbot.json'];
    let configContent = '';
    for (const p of configPaths) {
      try { configContent = await readFile(p, 'utf-8'); break; } catch { continue; }
    }
    const config = JSON.parse(configContent);
    return config.agents?.defaults?.workspace || '/root/clawd';
  } catch {
    // Fallback to default workspace path
    return '/root/clawd';
  }
}

// Get agent name from database
function getAgentName(agentId: string): string | null {
  try {
    const db = new Database('/root/.superclaw/superclaw.db');
    const agent = db.prepare('SELECT name FROM agent_definitions WHERE id = ?').get(agentId) as { name?: string } | undefined;
    db.close();
    return agent?.name || null;
  } catch {
    return null;
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

export async function GET(request: Request) {
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
    // Get agent ID from query params
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent');
    
    const workspacePath = await getWorkspacePath(agentId);
    const agentName = agentId ? getAgentName(agentId) : null;
    
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

    // Also include memory/ daily files
    const memoryFiles: Array<{ name: string; exists: boolean }> = [];
    try {
      const memoryDir = path.join(workspacePath, 'memory');
      const dirStat = await stat(memoryDir);
      if (dirStat.isDirectory()) {
        const entries = await readdir(memoryDir);
        const mdFiles = entries
          .filter(f => f.endsWith('.md') || f.endsWith('.json'))
          .sort()
          .reverse() // newest first
          .slice(0, 14); // last 2 weeks
        for (const f of mdFiles) {
          memoryFiles.push({ name: `memory/${f}`, exists: true });
        }
      }
    } catch {
      // no memory dir
    }

    return NextResponse.json({
      workspacePath,
      agentName,
      files: [...files, ...memoryFiles]
    });
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return NextResponse.json(
      { error: 'Failed to list workspace files' },
      { status: 500 }
    );
  }
}