import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

function getGatewayConfig() {
  const configPaths = [
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

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only edit+ roles can spawn agents
  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const gatewayConfig = getGatewayConfig();
    if (!gatewayConfig) {
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
    }

    // Send message to main session to trigger work pickup
    const response = await fetch(
      `http://127.0.0.1:${gatewayConfig.port}/sessions/main/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayConfig.token}`,
        },
        body: JSON.stringify({
          text: 'Check the work queue and spawn a sub-agent for the highest priority task in backlog.',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      return NextResponse.json(
        { error: `Gateway error: ${response.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Agent spawn triggered' });
  } catch (error) {
    console.error('Error spawning agent:', error);
    return NextResponse.json({ error: 'Failed to spawn agent' }, { status: 500 });
  }
}
