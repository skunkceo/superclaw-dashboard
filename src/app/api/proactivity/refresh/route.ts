import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runIntelRefresh } from '@/lib/intel';
import { generateSuggestionsFromIntel } from '@/lib/suggestions';
import { getProactivitySetting, setProactivitySetting } from '@/lib/db';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Rate-limit: don't refresh more than once per hour unless forced
  const lastRefresh = parseInt(getProactivitySetting('last_intel_refresh') || '0');
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (!force && lastRefresh > hourAgo) {
    const nextRefreshIn = Math.ceil((lastRefresh + 60 * 60 * 1000 - Date.now()) / 60000);
    return NextResponse.json({
      skipped: true,
      message: `Last refresh was ${Math.floor((Date.now() - lastRefresh) / 60000)} min ago. Next refresh available in ${nextRefreshIn} min. Use ?force=true to override.`,
    });
  }

  try {
    setProactivitySetting('last_intel_refresh', Date.now().toString());
    const intelResult = await runIntelRefresh();
    const sugResult = await generateSuggestionsFromIntel();

    return NextResponse.json({
      success: true,
      ...intelResult,
      suggestions: sugResult,
      message: `Intel refresh complete: ${intelResult.itemsAdded} new items added, ${sugResult.fromIntel + sugResult.standing} suggestions generated`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Intel refresh failed', detail: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lastRefresh = parseInt(getProactivitySetting('last_intel_refresh') || '0');
  const lastSuggestionRun = parseInt(getProactivitySetting('last_suggestion_run') || '0');

  return NextResponse.json({
    lastRefresh: lastRefresh || null,
    lastRefreshFormatted: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    lastSuggestionRun: lastSuggestionRun || null,
    nextRefreshAvailable: lastRefresh ? new Date(lastRefresh + 60 * 60 * 1000).toISOString() : 'now',
  });
}
