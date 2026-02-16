import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

const PREFS_FILE = join(process.cwd(), 'data', 'model-prefs.json');

const DEFAULT_PREFS = {
  data_pulls: 'haiku',
  content: 'sonnet',
  code: 'sonnet',
  strategy: 'opus',
  research: 'sonnet',
  summaries: 'haiku',
};

const MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-3-5-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20250514',
};

function getPrefs() {
  try {
    if (existsSync(PREFS_FILE)) {
      return JSON.parse(readFileSync(PREFS_FILE, 'utf8'));
    }
  } catch {}
  return DEFAULT_PREFS;
}

/**
 * Determine which preference key to use based on task title/description
 */
function getPreferenceKey(taskTitle: string): string {
  const lower = taskTitle.toLowerCase();
  
  // Data pulls - simple extraction, API calls, sitemaps
  if (/(data pull|sitemap|gsc|ga4|api call|extract|fetch)/.test(lower)) {
    return 'data_pulls';
  }
  
  // Content writing - blog posts, docs, copy
  if (/(blog|content|write|copy|doc|article|post)/.test(lower)) {
    return 'content';
  }
  
  // Code generation - implementing features, PRs, debugging
  if (/(code|implement|pr|debug|refactor|feature|fix|endpoint)/.test(lower)) {
    return 'code';
  }
  
  // Strategy & architecture - complex planning, decisions
  if (/(strategy|architect|planning|decision|design|system|complex)/.test(lower)) {
    return 'strategy';
  }
  
  // Research & analysis - SEO, competitors, market research
  if (/(research|competitor|seo|analysis|audit|opportunity)/.test(lower)) {
    return 'research';
  }
  
  // Summaries - briefs, reports, status updates
  if (/(summary|brief|report|status|update|overview)/.test(lower)) {
    return 'summaries';
  }
  
  // Default to content for unknown types
  return 'content';
}

/**
 * Get the appropriate model for a task based on saved preferences
 */
function getModelForTask(taskTitle: string): string {
  const prefs = getPrefs();
  const prefKey = getPreferenceKey(taskTitle);
  const modelPref = prefs[prefKey] || 'sonnet';
  return MODEL_MAP[modelPref] || MODEL_MAP.sonnet;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const task = searchParams.get('task');
  const explain = searchParams.get('explain') === 'true';

  if (!task) {
    return NextResponse.json({ error: 'Missing task parameter' }, { status: 400 });
  }

  const category = getPreferenceKey(task);
  const model = getModelForTask(task);
  const modelName = Object.keys(MODEL_MAP).find(k => MODEL_MAP[k] === model) || 'sonnet';

  if (explain) {
    return NextResponse.json({
      task,
      category,
      model,
      modelName,
      prefs: getPrefs(),
    });
  }

  return NextResponse.json({ model });
}
