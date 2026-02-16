import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

function getGatewayConfig() {
  const configPaths = [
    '/root/.openclaw/openclaw.json',
    '/root/.clawdbot/clawdbot.json',
    join(process.env.HOME || '', '.clawdbot/clawdbot.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const config = JSON.parse(readFileSync(path, 'utf8'));
        return {
          port: config?.gateway?.port || 18789,
          token: config?.gateway?.auth?.token || '',
        };
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await request.json();
  const { task, model, mode } = body;

  if (!task || typeof task !== 'string' || task.trim().length === 0) {
    return NextResponse.json({ error: 'Task is required' }, { status: 400 });
  }

  const gatewayConfig = getGatewayConfig();
  if (!gatewayConfig) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
  }

  try {
    if (mode === 'direct') {
      // Send directly to main agent
      const response = await fetch(
        `http://127.0.0.1:${gatewayConfig.port}/sessions/main/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gatewayConfig.token}`,
          },
          body: JSON.stringify({ text: task.trim() }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Gateway error: ${response.status} - ${errorText}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, mode: 'direct', message: 'Sent to main agent' });
    } else {
      // Spawn as sub-agent — tell main to spawn it with specific model
      const spawnInstruction = model
        ? `Spawn a sub-agent on model "${model}" with the following task:\n\n${task.trim()}`
        : `Spawn a sub-agent (use Sonnet) with the following task:\n\n${task.trim()}`;

      const response = await fetch(
        `http://127.0.0.1:${gatewayConfig.port}/sessions/main/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gatewayConfig.token}`,
          },
          body: JSON.stringify({ text: spawnInstruction }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Gateway error: ${response.status} - ${errorText}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, mode: 'spawn', message: 'Sub-agent spawn requested' });
    }
  } catch (error) {
    console.error('Error dispatching task:', error);
    return NextResponse.json({ error: 'Failed to dispatch task' }, { status: 500 });
  }
}
