import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAgentDefinition, updateAgentDefinition, deleteAgentDefinition, incrementAgentSpawnCount } from '@/lib/db';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
      } catch { continue; }
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const agent = getAgentDefinition(id);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ agent });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'view') return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const { id } = await params;
  const agent = getAgentDefinition(id);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'description', 'soul', 'model', 'skills', 'tools', 'color', 'icon', 'memory_dir', 'system_prompt', 'max_tokens', 'thinking'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = key === 'skills' || key === 'tools' ? JSON.stringify(body[key]) : body[key];
    }
  }

  updateAgentDefinition(id, updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  deleteAgentDefinition(id);
  return NextResponse.json({ success: true });
}

// POST = spawn an instance of this agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'view') return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const { id } = await params;
  const agent = getAgentDefinition(id);
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const taskOverride = body.task || '';

  const gatewayConfig = getGatewayConfig();
  if (!gatewayConfig) return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });

  // Build spawn instruction for main agent
  const skills = JSON.parse(agent.skills || '[]');
  const soulSnippet = agent.soul ? `\n\nAgent personality:\n${agent.soul}` : '';
  const skillsSnippet = skills.length > 0 ? `\nSkills: ${skills.join(', ')}` : '';
  const taskDesc = taskOverride || agent.description || `Act as the ${agent.name} agent`;

  const spawnMessage = [
    `Spawn a sub-agent with label "${agent.name}" on model "${agent.model}" with thinking level "${agent.thinking}".`,
    `\nTask for the sub-agent:\n${taskDesc}`,
    soulSnippet,
    skillsSnippet,
    agent.system_prompt ? `\n\nAdditional instructions:\n${agent.system_prompt}` : '',
  ].join('');

  try {
    const response = await fetch(
      `http://127.0.0.1:${gatewayConfig.port}/sessions/main/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayConfig.token}`,
        },
        body: JSON.stringify({ text: spawnMessage }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Gateway: ${errorText}` }, { status: 500 });
    }

    incrementAgentSpawnCount(id);
    return NextResponse.json({ success: true, message: `${agent.name} agent spawn requested` });
  } catch (error) {
    console.error('Error spawning agent:', error);
    return NextResponse.json({ error: 'Failed to spawn' }, { status: 500 });
  }
}
