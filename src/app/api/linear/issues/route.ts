import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOpenLinearIssues, createLinearIssue, getCategoryLabelId, mapPriorityToLinear } from '@/lib/linear';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const issues = await getOpenLinearIssues();
    return NextResponse.json({ issues });
  } catch (err) {
    console.error('Failed to fetch Linear issues:', err);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, priority, category } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const labelIds: string[] = [];
    if (category) {
      const labelId = await getCategoryLabelId(category);
      if (labelId) labelIds.push(labelId);
    }

    const issue = await createLinearIssue({
      title,
      description,
      priority: priority ? mapPriorityToLinear(priority) : 3,
      labelIds,
    });

    if (!issue) {
      return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, issue });
  } catch (err) {
    console.error('Failed to create Linear issue:', err);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
