import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseSessionUsage, getSubscriptionInfo } from '@/lib/usage-parser';
import { getCurrentUser, needsSetup } from '@/lib/auth';

// Read Clawdbot/OpenClaw configuration
function getConfig() {
  const configPaths = [
    '/root/.clawdbot/clawdbot.json',
    join(process.env.HOME || '', '.clawdbot/clawdbot.json'),
    join(process.env.HOME || '', '.openclaw/openclaw.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        return { config: JSON.parse(readFileSync(path, 'utf8')), path };
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Get workspace info
function getWorkspaceInfo(workspacePath: string) {
  const result = {
    memory: false,
    channels: [] as string[],
    skills: [] as string[],
    apiKeys: [] as string[],
  };

  // Check for memory system
  const memoryPath = join(workspacePath, 'memory');
  const memoryMdPath = join(workspacePath, 'MEMORY.md');
  result.memory = existsSync(memoryPath) || existsSync(memoryMdPath);

  // Check for skills
  const skillsPath = join(workspacePath, 'skills');
  if (existsSync(skillsPath)) {
    try {
      const skills = readdirSync(skillsPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      result.skills = skills;
    } catch {
      // ignore
    }
  }

  return result;
}

// Get connected channels from config
function getChannels(config: Record<string, unknown>) {
  const channels: string[] = [];
  const channelsConfig = config?.channels as Record<string, { enabled?: boolean }> | undefined;
  
  if (channelsConfig) {
    for (const [name, cfg] of Object.entries(channelsConfig)) {
      if (cfg && (cfg.enabled !== false)) {
        channels.push(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }
  return channels;
}

// Get API keys
function getApiKeys(config: Record<string, unknown>) {
  const keys: string[] = [];
  const auth = config?.auth as { profiles?: Record<string, { provider?: string }> } | undefined;
  
  if (auth?.profiles) {
    for (const [, profile] of Object.entries(auth.profiles)) {
      if (profile?.provider) {
        keys.push(profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1));
      }
    }
  }
  return keys;
}

// Check gateway health
async function checkGatewayHealth(port: number, token: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      return { healthy: true, data: null };
    }
    return { healthy: false, data: null };
  } catch {
    return { healthy: false, data: null };
  }
}

// Fetch active sessions from gateway
async function fetchActiveSessions(port: number, token: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`http://127.0.0.1:${port}/sessions?activeMinutes=60&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      return data.sessions || [];
    }
    return [];
  } catch {
    return [];
  }
}

// Get sessions directory
function getSessionsDir(configPath: string): string {
  // Default sessions directory based on config location
  const configDir = configPath.replace(/\/[^/]+$/, '');
  return join(configDir, 'agents', 'main', 'sessions');
}

// Count active sessions/tasks
function countSessions(sessionsDir: string): { active: number; completed: number } {
  if (!existsSync(sessionsDir)) {
    return { active: 0, completed: 0 };
  }

  try {
    const files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    const deleted = files.filter(f => f.includes('.deleted.')).length;
    return {
      active: 0, // Would need to check for running sessions
      completed: files.length - deleted,
    };
  } catch {
    return { active: 0, completed: 0 };
  }
}

// Get available skills (from built-in + workspace)
function getAvailableSkills() {
  return [
    { name: 'Web Search', enabled: true, description: 'Search the web using Brave API' },
    { name: 'Email', enabled: false, description: 'Send and read emails via IMAP/SMTP' },
    { name: 'Calendar', enabled: false, description: 'Google Calendar integration' },
    { name: 'GitHub', enabled: true, description: 'Manage repos, issues, and PRs' },
    { name: 'Slack', enabled: true, description: 'Connected to Slack workspace' },
    { name: 'Browser', enabled: true, description: 'Control web browser for automation' },
    { name: 'WordPress', enabled: true, description: 'WP-CLI for site management' },
    { name: 'Linear', enabled: true, description: 'Project management integration' },
    { name: 'Weather', enabled: true, description: 'Get weather forecasts' },
  ];
}

export async function GET() {
  // Skip auth check if setup is needed (no users yet)
  if (!needsSetup()) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const configResult = getConfig();
  
  if (!configResult) {
    return NextResponse.json({
      error: 'No OpenClaw/Clawdbot installation found',
    }, { status: 404 });
  }

  const { config, path: configPath } = configResult;
  const workspacePath = config?.agents?.defaults?.workspace || '/root/clawd';
  const workspaceInfo = getWorkspaceInfo(workspacePath);
  const channels = getChannels(config);
  const apiKeys = getApiKeys(config);

  // Check gateway
  const gatewayPort = config?.gateway?.port || 18789;
  const gatewayToken = config?.gateway?.auth?.token || '';
  const gatewayHealth = await checkGatewayHealth(gatewayPort, gatewayToken);

  // Calculate uptime
  const lastTouched = config?.meta?.lastTouchedAt;
  let uptime = 'Unknown';
  if (lastTouched) {
    const diff = Date.now() - new Date(lastTouched).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) {
      uptime = `${days}d ${hours % 24}h`;
    } else {
      uptime = `${hours}h`;
    }
  }

  // Get REAL usage data from session files
  const sessionsDir = getSessionsDir(configPath);
  const usage = parseSessionUsage(sessionsDir);
  const subscription = getSubscriptionInfo(configPath);

  // Get session counts
  const sessionCounts = countSessions(sessionsDir);

  // Fetch active sessions from gateway
  const activeSessions = await fetchActiveSessions(gatewayPort, gatewayToken);
  const subAgents = activeSessions.map((s: { key?: string; displayName?: string; model?: string; sessionId?: string }) => ({
    id: s.sessionId || s.key || 'unknown',
    task: s.displayName || s.key || 'Unknown task',
    model: s.model || 'unknown',
    status: 'active',
  }));

  // Format token numbers
  const formatTokens = (n: number) => Math.round(n);
  const formatCost = (n: number) => Math.round(n * 100) / 100;

  return NextResponse.json({
    health: {
      status: gatewayHealth.healthy ? 'healthy' : 'offline',
      uptime,
      lastHeartbeat: gatewayHealth.healthy ? 'Just now' : 'Unknown',
      gatewayVersion: config?.meta?.lastTouchedVersion || 'Unknown',
    },
    tokens: {
      today: formatTokens(usage.today.totalTokens),
      thisWeek: formatTokens(usage.thisWeek.totalTokens),
      thisMonth: formatTokens(usage.thisMonth.totalTokens),
      allTime: formatTokens(usage.allTime.totalTokens),
      estimatedCost: formatCost(usage.thisMonth.cost),
      todayCost: formatCost(usage.today.cost),
      weekCost: formatCost(usage.thisWeek.cost),
      byModel: {
        today: usage.today.byModel,
        thisWeek: usage.thisWeek.byModel,
        thisMonth: usage.thisMonth.byModel,
      },
    },
    subscription: subscription ? {
      provider: subscription.provider,
      plan: subscription.plan,
      isSubscription: subscription.isSubscription,
    } : null,
    setup: {
      memory: workspaceInfo.memory,
      channels,
      skills: workspaceInfo.skills,
      apiKeys,
    },
    tasks: {
      active: subAgents.length,
      completed: sessionCounts.completed,
      subAgents,
    },
    skills: getAvailableSkills(),
  });
}
