'use client';

import { useEffect, useState } from 'react';
import { TokenUsage } from '@/components/TokenUsage';
import { SkillsPanel } from '@/components/SkillsPanel';
import { LobsterLogo } from '@/components/LobsterLogo';
import { ProactivityBanner } from '@/components/ProactivityBanner';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelUsage {
  input: number;
  output: number;
  cost: number;
}

interface DashboardData {
  health: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: string;
    lastHeartbeat: string;
    gatewayVersion: string;
    defaultModel?: string;
  };
  tokens: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime?: number;
    estimatedCost: number;
    todayCost?: number;
    weekCost?: number;
    byModel?: {
      today?: Record<string, ModelUsage>;
      thisWeek?: Record<string, ModelUsage>;
      thisMonth?: Record<string, ModelUsage>;
    };
  };
  subscription?: {
    provider: string;
    plan: string;
    isSubscription?: boolean;
  } | null;
  setup: {
    memory: boolean;
    channels: string[];
    skills: string[];
    apiKeys: string[];
  };
  tasks: {
    active: number;
    pending: number;
    completed: number;
    allTasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'active' | 'completed';
      assigned_agent: string | null;
      what_doing: string | null;
      created_at: number;
      completed_at: number | null;
      session_id: string | null;
      source: 'chat' | 'backlog' | 'cron';
      priority?: string;
      area?: string;
    }>;
    mainSession?: {
      status: 'active' | 'idle' | 'done';
      lastActive: string;
      recentMessages?: number;
      currentTask?: string | null;
      channel?: string;
      model?: string;
      totalTokens?: number;
      queuedMessages?: number;
    };
    allSessions?: Array<{
      key: string;
      sessionId?: string;
      displayName: string;
      status: 'active' | 'idle' | 'done';
      lastActive: string;
      model: string;
      totalTokens: number;
      messages: Array<{ role: string; content: string; timestamp: string }>;
    }>;
    activityFeed?: Array<{
      type: string;
      sessionKey: string;
      sessionName: string;
      role: string;
      content: string;
      timestamp: string;
      model: string;
    }>;
  };
  skills: Array<{ name: string; enabled: boolean; description: string }>;
}

interface AgentData {
  workspaces: Array<{
    label: string;
    name: string;
    emoji: string;
    workspacePath: string;
    hasMemory: boolean;
    memorySize: number;
  }>;
  sessions: Array<{
    label: string;
    sessionKey: string;
    status: 'active' | 'idle' | 'waiting';
    lastActive: string;
    messageCount: number;
    model: string;
  }>;
}

interface ActivityEntry {
  id: string;
  agent_label: string;
  action_type: string;
  summary: string;
  details?: string;
  links?: string;
  created_at: number;
}

// ─── Compact Team Box ─────────────────────────────────────────────────────────

function CompactTeam({ agentData }: { agentData: AgentData | null }) {
  const agents = agentData?.workspaces.map(w => {
    const session = agentData.sessions.find(s => s.label === w.label);
    return { ...w, status: session?.status || 'idle' };
  }) || [];

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Team</h3>
        <Link href="/agents" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
          Manage →
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Link href="/agents" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            No agents configured
          </Link>
        </div>
      ) : (
        <>
          {/* Avatar row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {agents.map(agent => (
              <Link
                key={agent.label}
                href="/agents"
                title={agent.name}
                className="relative group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-zinc-800 border-2 transition-all ${
                  agent.status === 'active'
                    ? 'border-orange-500/60 hover:border-orange-500'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}>
                  {agent.emoji || '🤖'}
                </div>
                {/* Status dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                  agent.status === 'active' ? 'bg-green-400' : 'bg-zinc-600'
                }`} />
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-zinc-800 text-zinc-200 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  {agent.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Status line */}
          <div className="mt-auto text-xs text-zinc-600">
            {activeCount > 0
              ? <span className="text-green-400">{activeCount} active</span>
              : 'All idle'}
            <span className="text-zinc-700"> · {agents.length} agents</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Work Log Widget ──────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  started: '▶',
  completed: '✓',
  commit: '⊕',
  pr_opened: '⤴',
  deploy: '⚡',
  error: '✕',
  blocked: '⊘',
  research: '◎',
  analysis: '◈',
  report: '▤',
  content: '✎',
  writing: '✎',
  monitoring: '◷',
  intel: '◉',
  site_check: '◉',
  info: '◦',
};

const ACTION_COLORS: Record<string, string> = {
  completed: 'text-green-400',
  commit: 'text-blue-400',
  pr_opened: 'text-purple-400',
  deploy: 'text-orange-400',
  error: 'text-red-400',
  blocked: 'text-red-400',
  started: 'text-orange-300',
  research: 'text-zinc-400',
  analysis: 'text-zinc-400',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function WorkLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/activity?limit=8');
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Work Log</h3>
        <Link href="/reports" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-800/60 rounded animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-zinc-600">No activity logged yet</span>
        </div>
      ) : (
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
          {entries.map(entry => {
            const icon = ACTION_ICONS[entry.action_type] || '◦';
            const color = ACTION_COLORS[entry.action_type] || 'text-zinc-500';
            let parsedLinks: Array<{ label: string; url: string }> = [];
            try { parsedLinks = JSON.parse(entry.links || '[]'); } catch { /* ignore */ }

            return (
              <div key={entry.id} className="flex items-start gap-2.5 py-1.5 group">
                <span className={`mt-0.5 w-4 flex-shrink-0 text-center text-[11px] font-mono ${color}`}>
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-zinc-300 leading-snug line-clamp-1">
                    {entry.summary}
                  </span>
                  {parsedLinks.length > 0 && (
                    <div className="flex gap-2 mt-0.5">
                      {parsedLinks.slice(0, 2).map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 text-[10px] text-zinc-700 mt-0.5 font-mono whitespace-nowrap">
                  {timeAgo(entry.created_at * 1000)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, agentsRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/agents/list'),
        ]);
        if (!statusRes.ok) throw new Error('Failed to fetch status');
        setData(await statusRes.json());
        if (agentsRes.ok) setAgentData(await agentsRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LobsterLogo className="w-16 h-16 animate-pulse" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'No data'}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">

        {/* ── Status Strip ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              data.health.status === 'healthy' ? 'bg-green-400' :
              data.health.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span className="text-sm text-zinc-300 font-medium capitalize">{data.health.status}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700 hidden sm:block" />
          <span className="text-xs text-zinc-500 font-mono">{data.health.defaultModel || 'claude-sonnet'}</span>
          <div className="w-px h-4 bg-zinc-700 hidden sm:block" />
          <span className="text-xs text-zinc-500">Up {data.health.uptime}</span>
          {data.subscription && (
            <>
              <div className="w-px h-4 bg-zinc-700 hidden sm:block" />
              <span className="text-xs text-zinc-600 capitalize">{data.subscription.plan}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/launchpad" className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launchpad
            </Link>
          </div>
        </div>

        {/* ── Workspace Quick Links ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {(['SOUL.md', 'MEMORY.md', 'TOOLS.md', 'HEARTBEAT.md'] as const).map(file => (
            <Link
              key={file}
              href={file === 'MEMORY.md' ? '/memory' : `/workspace?file=${file}`}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors font-mono"
            >
              {file}
            </Link>
          ))}
          <Link href="/workspace" className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            All files →
          </Link>
        </div>

        {/* ── Proactivity (prominent, full-width) ───────────────────── */}
        <ProactivityBanner />

        {/* ── Token Usage ───────────────────────────────────────────── */}
        <TokenUsage tokens={data.tokens} subscription={data.subscription} />

        {/* ── Team + Work Log ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="md:col-span-1">
            <CompactTeam agentData={agentData} />
          </div>
          <div className="md:col-span-2">
            <WorkLog />
          </div>
        </div>

        {/* ── Skills ────────────────────────────────────────────────── */}
        <SkillsPanel skills={data.skills} />

      </div>
    </main>
  );
}
