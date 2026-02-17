import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

interface SandboxMeta {
  agent: string;
  taskId: string;
  repo: string;
  branch: string;
  created: string;
  repoPath: string;
}

interface Sandbox {
  name: string;
  agent: string;
  taskId: string;
  repo: string;
  branch: string;
  created: string;
  size: string;
  path: string;
}

export async function GET() {
  try {
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.openclaw', 'workspace', 'agent-repo-config.json');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        sandboxes: [],
        total: 0,
        totalSize: '0B'
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const volumePath = config.volumePath;

    if (!fs.existsSync(volumePath)) {
      return NextResponse.json({
        sandboxes: [],
        total: 0,
        totalSize: '0B'
      });
    }

    const sandboxes: Sandbox[] = [];
    const dirs = fs.readdirSync(volumePath);

    for (const dir of dirs) {
      const sandboxPath = path.join(volumePath, dir);
      const metaPath = path.join(sandboxPath, '.sandbox-meta.json');

      if (fs.existsSync(metaPath)) {
        const meta: SandboxMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        
        // Get size
        const sizeOutput = execSync(`du -sh "${sandboxPath}"`, { encoding: 'utf-8' });
        const size = sizeOutput.split('\t')[0];

        sandboxes.push({
          name: dir,
          agent: meta.agent,
          taskId: meta.taskId,
          repo: meta.repo,
          branch: meta.branch,
          created: meta.created,
          size,
          path: sandboxPath
        });
      }
    }

    // Get total size
    const totalSizeOutput = execSync(`du -sh "${volumePath}" 2>/dev/null || echo "0\t"`, { encoding: 'utf-8' });
    const totalSize = totalSizeOutput.split('\t')[0];

    return NextResponse.json({
      sandboxes,
      total: sandboxes.length,
      totalSize,
      volumePath
    });

  } catch (error) {
    console.error('Error listing sandboxes:', error);
    return NextResponse.json(
      { error: 'Failed to list sandboxes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, agent, taskId, repo } = await request.json();

    const homeDir = os.homedir();
    const scriptsDir = path.join(homeDir, '.openclaw', 'workspace', 'scripts');

    if (action === 'create') {
      const script = path.join(scriptsDir, 'create-agent-sandbox.sh');
      if (!fs.existsSync(script)) {
        return NextResponse.json(
          { error: 'Sandbox creation script not found' },
          { status: 404 }
        );
      }

      const output = execSync(`${script} ${agent} ${taskId} ${repo}`, {
        encoding: 'utf-8',
        timeout: 30000
      });

      return NextResponse.json({
        success: true,
        output
      });

    } else if (action === 'cleanup') {
      const script = path.join(scriptsDir, 'cleanup-agent-sandbox.sh');
      if (!fs.existsSync(script)) {
        return NextResponse.json(
          { error: 'Sandbox cleanup script not found' },
          { status: 404 }
        );
      }

      const output = execSync(`${script} ${agent} ${taskId}`, {
        encoding: 'utf-8',
        timeout: 30000
      });

      return NextResponse.json({
        success: true,
        output
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error managing sandbox:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage sandbox' },
      { status: 500 }
    );
  }
}
