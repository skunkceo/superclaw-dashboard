import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createActivityEntry, getActivityLog } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agent_label = searchParams.get('agent') || undefined;
  const action_type = searchParams.get('type') || undefined;
  const since = searchParams.get('since') ? parseInt(searchParams.get('since')!) : undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

  const entries = getActivityLog({ agent_label, action_type, since, limit });
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  // Allow either authenticated session OR a shared API token for agent logging
  const currentUser = await getCurrentUser();
  const authHeader = request.headers.get('Authorization');
  const apiToken = process.env.ACTIVITY_API_TOKEN;
  const tokenAuth = apiToken && authHeader === `Bearer ${apiToken}`;

  if (!currentUser && !tokenAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { agent_label, action_type, summary, details, links, task_id, session_key } = body;

    if (!action_type || !summary) {
      return NextResponse.json({ error: 'action_type and summary are required' }, { status: 400 });
    }

    const entry = {
      id: uuidv4(),
      agent_label: agent_label || 'main',
      action_type,
      summary,
      details: details || null,
      links: links ? JSON.stringify(links) : '[]',
      task_id: task_id || null,
      session_key: session_key || null,
    };

    createActivityEntry(entry);
    return NextResponse.json({ success: true, id: entry.id });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
