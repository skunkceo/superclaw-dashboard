import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import packageJson from '../../../../package.json';
import { getCurrentUser } from '@/lib/auth';

const NPM_REGISTRY_DASHBOARD = 'https://registry.npmjs.org/@skunkceo/superclaw-dashboard';
const NPM_REGISTRY_OPENCLAW = 'https://registry.npmjs.org/openclaw';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Dashboard version
  const dashboardCurrent = packageJson.version;
  let dashboardLatest = dashboardCurrent;
  let dashboardUpdateAvailable = false;

  try {
    const res = await fetch(NPM_REGISTRY_DASHBOARD, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      dashboardLatest = data['dist-tags']?.latest || dashboardCurrent;
      dashboardUpdateAvailable = compareVersions(dashboardLatest, dashboardCurrent) > 0;
    }
  } catch (e) {
    console.error('Failed to check dashboard version:', e);
  }

  // OpenClaw version
  let openclawCurrent = 'unknown';
  let openclawLatest = 'unknown';
  let openclawUpdateAvailable = false;
  let openclawCommand = 'openclaw'; // or 'clawdbot' for legacy

  try {
    // Try openclaw first, fall back to clawdbot
    try {
      openclawCurrent = execSync('openclaw --version 2>/dev/null', { encoding: 'utf8' }).trim();
    } catch {
      try {
        openclawCurrent = execSync('clawdbot --version 2>/dev/null', { encoding: 'utf8' }).trim();
        openclawCommand = 'clawdbot';
      } catch {
        openclawCurrent = 'not installed';
      }
    }

    // Check npm for latest
    const res = await fetch(NPM_REGISTRY_OPENCLAW, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      openclawLatest = data['dist-tags']?.latest || openclawCurrent;
      if (openclawCurrent !== 'not installed' && openclawCurrent !== 'unknown') {
        openclawUpdateAvailable = compareVersions(openclawLatest, openclawCurrent) > 0;
      }
    }
  } catch (e) {
    console.error('Failed to check OpenClaw version:', e);
  }

  // Node version
  const nodeVersion = process.version;

  return NextResponse.json({
    dashboard: {
      current: dashboardCurrent,
      latest: dashboardLatest,
      updateAvailable: dashboardUpdateAvailable,
      updateCommand: 'superclaw update',
      changelog: dashboardUpdateAvailable 
        ? `https://github.com/skunkceo/superclaw-dashboard/releases/tag/v${dashboardLatest}` 
        : null
    },
    openclaw: {
      current: openclawCurrent,
      latest: openclawLatest,
      updateAvailable: openclawUpdateAvailable,
      command: openclawCommand,
      updateCommand: openclawCommand === 'clawdbot' 
        ? 'npm uninstall -g clawdbot && npm install -g openclaw'
        : 'npm update -g openclaw',
      isLegacy: openclawCommand === 'clawdbot',
      changelog: openclawUpdateAvailable
        ? `https://github.com/openclaw/openclaw/releases/tag/v${openclawLatest}`
        : null
    },
    node: {
      version: nodeVersion
    },
    checkedAt: new Date().toISOString()
  });
}

function compareVersions(a: string, b: string): number {
  // Handle date-based versions like 2026.2.13
  const partsA = a.split(/[.-]/).map(p => parseInt(p) || 0);
  const partsB = b.split(/[.-]/).map(p => parseInt(p) || 0);
  
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
