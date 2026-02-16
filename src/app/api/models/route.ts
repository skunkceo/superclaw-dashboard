import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Read OpenClaw config
function getConfig() {
  const configPaths = [
    '/root/.openclaw/openclaw.json',
    '/root/.clawdbot/clawdbot.json',
    join(process.env.HOME || '', '.openclaw/openclaw.json'),
    join(process.env.HOME || '', '.clawdbot/clawdbot.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getConfig();
  if (!config) {
    return NextResponse.json({ error: 'No OpenClaw config found' }, { status: 404 });
  }

  // Extract model info from config
  const profiles = config?.auth?.profiles || {};
  const models: Array<{
    provider: string;
    modelId: string;
    displayName: string;
    tier: string;
    available: boolean;
  }> = [];

  // Anthropic models (if configured)
  const anthropicProfile = profiles.anthropic || profiles.default;
  if (anthropicProfile) {
    models.push(
      { provider: 'Anthropic', modelId: 'claude-opus-4-20250514', displayName: 'Claude Opus 4', tier: 'Premium', available: true },
      { provider: 'Anthropic', modelId: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', tier: 'Balanced', available: true },
      { provider: 'Anthropic', modelId: 'claude-haiku-3-5-20241022', displayName: 'Claude Haiku 3.5', tier: 'Fast', available: true },
    );
  }

  // OpenAI models (if configured)
  const openaiProfile = profiles.openai;
  if (openaiProfile) {
    models.push(
      { provider: 'OpenAI', modelId: 'gpt-4o', displayName: 'GPT-4o', tier: 'Premium', available: true },
      { provider: 'OpenAI', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', tier: 'Fast', available: true },
    );
  }

  // Get default model from config
  const defaultModel = config?.agents?.defaults?.model?.primary || config?.agents?.defaults?.model || 'claude-sonnet-4-20250514';

  return NextResponse.json({
    models,
    defaultModel,
    configured: {
      anthropic: !!anthropicProfile,
      openai: !!openaiProfile,
    },
  });
}
