import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOpenLinearIssues, createLinearIssue, getCategoryLabelId, mapPriorityToLinear } from '@/lib/linear';
import { getSuggestionById, updateSuggestion } from '@/lib/db';

/**
 * GET /api/linear/issues
 * Returns open AI-team Linear issues (backlog/unstarted only)
 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const issues = await getOpenLinearIssues();
    return NextResponse.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Linear issues';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/linear/issues
 * Create a new Linear issue
 * Body: { title, description?, priority?, labelIds?, suggestionId? }
 * If suggestionId provided, update that suggestion's linear_issue_id/identifier/url in DB
 */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, priority, labelIds, suggestionId, category } = body as {
      title: string;
      description?: string;
      priority?: number;
      labelIds?: string[];
      suggestionId?: string;
      category?: string;
    };

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // If category is provided but no labelIds, map category to label
    let resolvedLabelIds = labelIds;
    if (!resolvedLabelIds && category) {
      resolvedLabelIds = [getCategoryLabelId(category)];
    }

    const issue = await createLinearIssue({
      title,
      description,
      priority: priority !== undefined ? mapPriorityToLinear(priority) : undefined,
      labelIds: resolvedLabelIds,
    });

    // If suggestionId is provided, link the suggestion to this Linear issue
    if (suggestionId) {
      const suggestion = getSuggestionById(suggestionId);
      if (suggestion) {
        updateSuggestion(suggestionId, { linear_issue_id: issue.id, linear_identifier: issue.identifier, linear_url: issue.url });
      }
    }

    return NextResponse.json({
      success: true,
      issue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Linear issue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
