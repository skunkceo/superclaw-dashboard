import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllSuggestions, updateSuggestion } from '@/lib/db';
import { createLinearIssue, getCategoryLabelId, mapPriorityToLinear } from '@/lib/linear';

/**
 * POST /api/linear/sync
 * Sync all suggestions without a linear_issue_id to Linear
 * For each suggestion where linear_issue_id IS NULL:
 *   - Create a Linear issue with title=suggestion.title, description=suggestion.why
 *   - Map category to label: marketing->marketing label, research->platform label, others->superclaw label
 *   - Map priority: 1->1(urgent), 2->2(high), 3->3(medium), 4->4(low)
 *   - Update suggestion row with returned id/identifier/url
 * Returns { synced: number, errors: string[] }
 */
export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const suggestions = getAllSuggestions().filter(s => !s.linear_issue_id);
  let synced = 0;
  const errors: string[] = [];

  for (const suggestion of suggestions) {
    try {
      const issue = await createLinearIssue({
        title: suggestion.title,
        description: suggestion.why,
        priority: mapPriorityToLinear(suggestion.priority),
        labelIds: [getCategoryLabelId(suggestion.category)],
      });

      updateSuggestion(suggestion.id, { linear_issue_id: issue.id, linear_identifier: issue.identifier, linear_url: issue.url });
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to sync "${suggestion.title.slice(0, 50)}...": ${message}`);
    }
  }

  return NextResponse.json({
    success: true,
    synced,
    total: suggestions.length,
    errors,
  });
}
