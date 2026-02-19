'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProactivitySummary {
  intel: { total: number; unread: number };
  suggestions: { pending: number; approved: number; queued: number };
  overnight: { activeRun: boolean; queuedCount: number; lastRunAt: number | null };
  lastRefresh: number | null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProactivityBanner() {
  const [data, setData] = useState<ProactivitySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [intelRes, sugRes, nightRes] = await Promise.all([
        fetch('/api/intel?stats=true'),
        fetch('/api/suggestions?stats=true'),
        fetch('/api/overnight'),
      ]);
      const intel = intelRes.ok ? await intelRes.json() : null;
      const sug = sugRes.ok ? await sugRes.json() : null;
      const night = nightRes.ok ? await nightRes.json() : null;
      setData({
        intel: { total: intel?.total || 0, unread: intel?.unread || 0 },
        suggestions: { pending: sug?.pending || 0, approved: sug?.approved || 0, queued: sug?.queued || 0 },
        overnight: {
          activeRun: !!night?.activeRun,
          queuedCount: night?.queuedCount || 0,
          lastRunAt: night?.lastRun?.started_at || null,
        },
        lastRefresh: intel?.lastRefresh ? parseInt(intel.lastRefresh) : null,
      });
    } catch { /* silent */ }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/proactivity/refresh', { method: 'POST' }); await load(); }
    finally { setRefreshing(false); }
  };

  if (!data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-32 mb-3" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-zinc-800 rounded-lg" />
          <div className="h-16 bg-zinc-800 rounded-lg" />
          <div className="h-16 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    );
  }

  const hasAttention = data.suggestions.pending > 0 || data.intel.unread > 0;
  const isRunning = data.overnight.activeRun;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${
      isRunning
        ? 'border-orange-500/30 bg-orange-500/5'
        : hasAttention
        ? 'border-zinc-700 bg-zinc-900'
        : 'border-zinc-800 bg-zinc-900/60'
    }`}>
      {/* Subtle gradient accent when active */}
      {(isRunning || hasAttention) && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white tracking-wide">Proactivity</h2>
            {hasAttention && (
              <span className="px-1.5 py-0.5 bg-orange-500 rounded-full text-[10px] font-bold text-white leading-none">
                {data.suggestions.pending + data.intel.unread}
              </span>
            )}
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Running
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data.lastRefresh && (
              <span className="text-[11px] text-zinc-600">
                refreshed {timeAgo(data.lastRefresh)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh intel"
              className="p-1.5 text-zinc-600 hover:text-orange-400 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link href="/proactivity" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors font-medium">
              Open →
            </Link>
          </div>
        </div>

        {/* Three stat zones */}
        <div className="grid grid-cols-3 gap-3">

          {/* Intel */}
          <Link href="/proactivity" className="group relative bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-all border border-zinc-800 hover:border-zinc-700">
            <div className="text-2xl font-bold text-white mb-1">{data.intel.unread}</div>
            <div className="text-xs text-zinc-500 leading-snug">Unread intel</div>
            {data.intel.unread > 0 && (
              <div className="mt-2.5 text-[10px] text-orange-400 font-medium group-hover:underline">Review →</div>
            )}
            {data.intel.total > 0 && (
              <div className="absolute top-3 right-3 text-[10px] text-zinc-700 font-mono">{data.intel.total} total</div>
            )}
          </Link>

          {/* Suggestions */}
          <Link href="/proactivity" className="group relative bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-all border border-zinc-800 hover:border-zinc-700">
            <div className="text-2xl font-bold text-white mb-1">{data.suggestions.pending}</div>
            <div className="text-xs text-zinc-500 leading-snug">Suggestions pending</div>
            {data.suggestions.pending > 0 && (
              <div className="mt-2.5 text-[10px] text-orange-400 font-medium group-hover:underline">Approve →</div>
            )}
            {data.suggestions.queued > 0 && (
              <div className="absolute top-3 right-3 text-[10px] text-zinc-600 font-mono">{data.suggestions.queued} queued</div>
            )}
          </Link>

          {/* Overnight */}
          <Link href="/proactivity" className={`group relative rounded-xl p-4 transition-all border ${
            isRunning
              ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15'
              : data.overnight.queuedCount > 0
              ? 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
              : 'bg-zinc-800/30 border-zinc-800 hover:bg-zinc-800/50'
          }`}>
            <div className={`text-2xl font-bold mb-1 ${isRunning ? 'text-orange-400' : 'text-white'}`}>
              {data.overnight.queuedCount}
            </div>
            <div className="text-xs text-zinc-500 leading-snug">
              {isRunning ? 'Run in progress' : 'Queued tonight'}
            </div>
            {data.overnight.lastRunAt && !isRunning && (
              <div className="mt-2.5 text-[10px] text-zinc-600">Last {timeAgo(data.overnight.lastRunAt)}</div>
            )}
            {isRunning && (
              <div className="mt-2.5 text-[10px] text-orange-400 font-medium group-hover:underline">View →</div>
            )}
            {!isRunning && data.overnight.queuedCount > 0 && (
              <div className="mt-2.5 text-[10px] text-zinc-500 font-medium group-hover:underline">Queue →</div>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
