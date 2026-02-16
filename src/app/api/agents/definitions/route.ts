import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllAgentDefinitions, createAgentDefinition } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agents = getAllAgentDefinitions();
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'view') return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const body = await request.json();
  const { name, description, soul, model, skills, tools, color, icon, memory_dir, system_prompt, max_tokens, thinking, handoff_rules } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  try {
    createAgentDefinition({
      id,
      name,
      description: description || null,
      soul: soul || null,
      model: model || 'claude-sonnet-4-20250514',
      skills: JSON.stringify(skills || []),
      tools: JSON.stringify(tools || []),
      color: color || '#f97316',
      icon: icon || 'bot',
      memory_dir: memory_dir || null,
      system_prompt: system_prompt || null,
      max_tokens: max_tokens || null,
      thinking: thinking || 'low',
      handoff_rules: JSON.stringify(handoff_rules || []),
      created_by: user.id,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Agent with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
