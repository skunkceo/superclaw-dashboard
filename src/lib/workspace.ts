/**
 * Workspace path resolution for SuperClaw API routes.
 *
 * IMPORTANT: Next.js runs as the `mike` PM2 user, so os.homedir() returns
 * /home/mike — NOT /root where OpenClaw config actually lives.
 * Always use these utilities instead of os.homedir() in API routes.
 *
 * Two distinct paths:
 *  - getMainWorkspace()   → /root/clawd  (main agent SOUL/MEMORY/TOOLS files)
 *  - getOpenClawWorkspace() → /root/.openclaw/workspace  (routing-rules, agent sub-workspaces)
 */

import { readFileSync } from 'fs';

let _cachedMain: string | null = null;

/** Main agent workspace: where MEMORY.md, SOUL.md, TOOLS.md etc. live */
export function getMainWorkspace(): string {
  if (_cachedMain) return _cachedMain;

  if (process.env.OPENCLAW_WORKSPACE) {
    _cachedMain = process.env.OPENCLAW_WORKSPACE;
    return _cachedMain;
  }

  const candidates = [
    '/root/.openclaw/openclaw.json',
    '/root/.clawdbot/clawdbot.json',
  ];

  for (const configPath of candidates) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      const workspace: string | undefined =
        config?.agents?.defaults?.workspace ||
        config?.agents?.main?.workspace ||
        config?.workspace;
      if (workspace) {
        _cachedMain = workspace;
        return workspace;
      }
    } catch {
      // try next
    }
  }

  const fallback = '/root/clawd';
  _cachedMain = fallback;
  return fallback;
}

/** OpenClaw internal workspace: routing-rules.json, agent sub-dirs, sessions */
export function getOpenClawWorkspace(): string {
  return '/root/.openclaw/workspace';
}

/** OpenClaw data dir */
export function getOpenClawDir(): string {
  return '/root/.openclaw';
}

// Backwards compat alias
export const getWorkspacePath = getMainWorkspace;
