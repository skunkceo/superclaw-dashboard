import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
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

function getPrefs() {
  try {
    if (existsSync(PREFS_FILE)) {
      return JSON.parse(readFileSync(PREFS_FILE, 'utf8'));
    }
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: Record<string, string>) {
  const dir = dirname(PREFS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ prefs: getPrefs() });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only edit+ roles can change model prefs
  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const { prefs } = await request.json();
    if (!prefs || typeof prefs !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
    }

    // Validate model values
    const validModels = ['haiku', 'sonnet', 'opus'];
    for (const [key, value] of Object.entries(prefs)) {
      if (!validModels.includes(value as string)) {
        return NextResponse.json({ error: `Invalid model: ${value}` }, { status: 400 });
      }
    }

    savePrefs(prefs);

    // Also update the marketing site prefs if available
    try {
      const marketingPrefsFile = '/home/mike/apps/websites/growth-marketing/data/superclaw-model-prefs.json';
      const marketingDir = dirname(marketingPrefsFile);
      if (!existsSync(marketingDir)) {
        mkdirSync(marketingDir, { recursive: true });
      }
      writeFileSync(marketingPrefsFile, JSON.stringify(prefs, null, 2));
    } catch {
      // Marketing site sync failed, but local save succeeded
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving model preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
