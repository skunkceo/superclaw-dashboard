import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markIntelRead } from '@/lib/db';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (action === 'read') {
    markIntelRead(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  db.prepare('DELETE FROM intel_items WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
