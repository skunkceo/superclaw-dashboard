'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthWrapper';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntelItem {
  id: string;
  category: 'market' | 'competitor' | 'seo' | 'opportunity' | 'wordpress';
  title: string;
  summary: string;
  url: string | null;
  source: string;
  relevance_score: number;
  created_at: number;
  read_at: number | null;
}

interface Suggestion {
  id: string;
  title: string;
  why: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  impact_score: number;
  category: string;
  source_intel_ids: string;
  status: 'pending' | 'approved' | 'dismissed' | 'queued' | 'in_progress' | 'completed';
  priority: number;
  created_at: number;
  actioned_at: number | null;
  notes: string | null;
}

interface OvernightState {
  enabled: boolean;
  startTime: string;
  endTime: string;
  activeRun: { id: string; started_at: number; tasks_started: number; tasks_completed: number } | null;
  lastRun: { id: string; started_at: number; completed_at: number; tasks_started: number; tasks_completed: number; summary: string | null } | null;
  queuedCount: number;
}

interface IntelStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
}

interface SuggestionStats {
  pending: number;
  approved: number;
  queued: number;
  completed: number;
  dismissed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  market: 'Market',
  competitor: 'Competitor',
  seo: 'SEO',
  opportunity: 'Opportunity',
  wordpress: 'WordPress',
};

const CATEGORY_COLORS: Record<string, string> = {
  market: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  competitor: 'bg-red-500/15 text-red-400 border-red-500/30',
  seo: 'bg-green-500/15 text-green-400 border-green-500/30',
  opportunity: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  wordpress: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const EFFORT_COLORS: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

const IMPACT_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-orange-400',
  high: 'text-orange-300',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-zinc-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

function IntelCard({ item, onRead, onDelete }: { item: IntelItem; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={`border rounded-xl p-4 transition-all ${item.read_at ? 'border-zinc-800 opacity-70' : 'border-zinc-700 bg-zinc-900/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[item.category] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
            <span className="text-xs text-zinc-600">{item.relevance_score}% relevant</span>
            {!item.read_at && <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />}
          </div>
          <h3 className="text-sm font-medium text-white leading-snug mb-1">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
                {item.title}
              </a>
            ) : item.title}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{item.summary}</p>
          <div className="text-xs text-zinc-700 mt-2">{timeAgo(item.created_at)}</div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!item.read_at && (
            <button
              onClick={() => onRead(item.id)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Mark as read"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAction,
}: {
  suggestion: Suggestion;
  onAction: (id: string, action: 'approve' | 'dismiss' | 'queue') => void;
}) {
  return (
    <div className="border border-zinc-700 bg-zinc-900/50 rounded-xl p-5 hover:border-zinc-600 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium capitalize">
              {suggestion.category}
            </span>
            <span className={`text-xs font-medium ${IMPACT_COLORS[suggestion.impact]}`}>
              {suggestion.impact.charAt(0).toUpperCase() + suggestion.impact.slice(1)} impact
            </span>
            <span className={`text-xs ${EFFORT_COLORS[suggestion.effort]}`}>
              {suggestion.effort} effort
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug mb-2">{suggestion.title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{suggestion.why}</p>
          <div className="text-xs text-zinc-700 mt-2">{timeAgo(suggestion.created_at)}</div>
        </div>
      </div>

      {suggestion.status === 'pending' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
          <button
            onClick={() => onAction(suggestion.id, 'approve')}
            className="flex-1 py-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-sm font-medium transition-colors border border-orange-500/20"
          >
            Approve
          </button>
          <button
            onClick={() => onAction(suggestion.id, 'queue')}
            className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium transition-colors border border-zinc-700"
          >
            Queue for overnight
          </button>
          <button
            onClick={() => onAction(suggestion.id, 'dismiss')}
            className="px-3 py-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 text-sm transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {suggestion.status === 'approved' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
          <span className="text-xs text-green-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Approved
          </span>
          <button
            onClick={() => onAction(suggestion.id, 'queue')}
            className="ml-auto py-1.5 px-3 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-medium transition-colors"
          >
            Move to overnight queue
          </button>
        </div>
      )}
    </div>
  );
}

function OvernightPanel({ overnight, onAction, onRefreshOvernightState }: {
  overnight: OvernightState;
  onAction: (action: 'start' | 'stop') => Promise<void>;
  onRefreshOvernightState: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (action: 'start' | 'stop') => {
    setLoading(true);
    setError('');
    try {
      await onAction(action);
      onRefreshOvernightState();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const isRunning = !!overnight.activeRun;

  return (
    <div className={`border rounded-xl p-6 ${isRunning ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-700 bg-zinc-900/50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-orange-400 animate-pulse' : 'bg-zinc-600'}`} />
            Overnight Mode
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isRunning
              ? `Running — ${overnight.activeRun?.tasks_completed || 0} of ${overnight.activeRun?.tasks_started || overnight.queuedCount} tasks complete`
              : `${overnight.queuedCount} task${overnight.queuedCount !== 1 ? 's' : ''} queued`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {overnight.lastRun && !isRunning && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-zinc-500">Last run</div>
              <div className="text-xs text-zinc-400">{timeAgo(overnight.lastRun.started_at)}</div>
              <div className="text-xs text-zinc-600">
                {overnight.lastRun.tasks_completed}/{overnight.lastRun.tasks_started} tasks
              </div>
            </div>
          )}
          <button
            onClick={() => handleAction(isRunning ? 'stop' : 'start')}
            disabled={loading || (!isRunning && overnight.queuedCount === 0)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              isRunning
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : overnight.queuedCount > 0
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
            }`}
          >
            {loading ? 'Working...' : isRunning ? 'Stop Run' : 'Start Overnight Run'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2">
          {error}
        </div>
      )}

      {!isRunning && overnight.queuedCount === 0 && (
        <div className="text-xs text-zinc-600 mt-2">
          Approve suggestions above and move them to the overnight queue to enable this.
        </div>
      )}

      {overnight.lastRun?.summary && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-600 font-medium mb-1">Last run summary</div>
          <div className="text-xs text-zinc-400">{overnight.lastRun.summary}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProactivityPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelStats, setIntelStats] = useState<IntelStats>({ total: 0, unread: 0, byCategory: {} });
  const [intelCategory, setIntelCategory] = useState<string>('all');

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats>({ pending: 0, approved: 0, queued: 0, completed: 0, dismissed: 0 });
  const [suggestionTab, setSuggestionTab] = useState<'pending' | 'approved' | 'queued' | 'completed' | 'dismissed'>('pending');

  const [overnight, setOvernight] = useState<OvernightState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [intelRes, sugRes, nightRes] = await Promise.all([
        fetch('/api/intel?limit=100'),
        fetch('/api/suggestions?limit=200'),
        fetch('/api/overnight'),
      ]);

      if (intelRes.ok) {
        const d = await intelRes.json();
        setIntel(d.items || []);
        setIntelStats(d.stats || { total: 0, unread: 0, byCategory: {} });
      }
      if (sugRes.ok) {
        const d = await sugRes.json();
        setSuggestions(d.suggestions || []);
        setSuggestionStats(d.stats || { pending: 0, approved: 0, queued: 0, completed: 0, dismissed: 0 });
      }
      if (nightRes.ok) {
        setOvernight(await nightRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleIntelRead = async (id: string) => {
    await fetch(`/api/intel/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read' }) });
    setIntel(prev => prev.map(i => i.id === id ? { ...i, read_at: Date.now() } : i));
  };

  const handleIntelDelete = async (id: string) => {
    await fetch(`/api/intel/${id}`, { method: 'DELETE' });
    setIntel(prev => prev.filter(i => i.id !== id));
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/intel?action=mark_all_read', { method: 'PATCH' });
    setIntel(prev => prev.map(i => ({ ...i, read_at: i.read_at || Date.now() })));
  };

  const handleSuggestionAction = async (id: string, action: 'approve' | 'dismiss' | 'queue') => {
    const statusMap = { approve: 'approved', dismiss: 'dismissed', queue: 'queued' } as const;
    const res = await fetch(`/api/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusMap[action] }),
    });
    if (res.ok) {
      const d = await res.json();
      setSuggestions(prev => prev.map(s => s.id === id ? d.suggestion : s));
      // Refresh stats
      const statsRes = await fetch('/api/suggestions?stats=true');
      if (statsRes.ok) setSuggestionStats(await statsRes.json());
      if (action === 'queue') {
        const nightRes = await fetch('/api/overnight');
        if (nightRes.ok) setOvernight(await nightRes.json());
      }
    }
  };

  const handleOvernightAction = async (action: 'start' | 'stop') => {
    const res = await fetch('/api/overnight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed');
    }
  };

  const handleIntelRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch('/api/proactivity/refresh', { method: 'POST' });
      const d = await res.json();
      setRefreshMsg(d.message || (d.skipped ? d.message : 'Done'));
      if (!d.skipped) await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredIntel = intelCategory === 'all'
    ? intel
    : intel.filter(i => i.category === intelCategory);

  const filteredSuggestions = suggestions.filter(s => s.status === suggestionTab);

  const SUGGESTION_TABS: Array<{ key: typeof suggestionTab; label: string; count: number }> = [
    { key: 'pending', label: 'Pending', count: suggestionStats.pending },
    { key: 'approved', label: 'Approved', count: suggestionStats.approved },
    { key: 'queued', label: 'Queued', count: suggestionStats.queued },
    { key: 'completed', label: 'Completed', count: suggestionStats.completed },
    { key: 'dismissed', label: 'Dismissed', count: suggestionStats.dismissed },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Proactivity</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Market intelligence, suggestions, and overnight autonomous work
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/reports')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
              >
                View Reports
              </button>
              <button
                onClick={handleIntelRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium transition-colors border border-orange-500/20 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh Intel'}
              </button>
            </div>
          </div>
          {refreshMsg && (
            <div className="mt-3 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2">
              {refreshMsg}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Intel items" value={intelStats.total} sub={`${intelStats.unread} unread`} />
          <StatCard label="Suggestions pending" value={suggestionStats.pending} sub={`${suggestionStats.approved} approved`} />
          <StatCard label="Queued for tonight" value={suggestionStats.queued} />
          <StatCard label="Completed" value={suggestionStats.completed} />
        </div>

        {/* Overnight Mode Panel */}
        {overnight && (
          <div className="mb-8">
            <OvernightPanel
              overnight={overnight}
              onAction={handleOvernightAction}
              onRefreshOvernightState={() => { fetch('/api/overnight').then(r => r.json()).then(setOvernight); }}
            />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Suggestions — main column */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Suggestions</h2>
              <div className="text-xs text-zinc-600">From Clawd, automatically generated</div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {SUGGESTION_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSuggestionTab(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    suggestionTab === tab.key
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${suggestionTab === tab.key ? 'bg-zinc-700' : 'bg-zinc-800'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Suggestion cards */}
            <div className="space-y-3">
              {filteredSuggestions.length === 0 ? (
                <div className="border border-zinc-800 rounded-xl p-8 text-center">
                  <div className="text-zinc-600 text-sm">
                    {suggestionTab === 'pending'
                      ? 'No pending suggestions. Refresh intel to generate some.'
                      : `No ${suggestionTab} suggestions.`}
                  </div>
                </div>
              ) : (
                filteredSuggestions.map(s => (
                  <SuggestionCard key={s.id} suggestion={s} onAction={handleSuggestionAction} />
                ))
              )}
            </div>
          </div>

          {/* Intelligence Feed — sidebar */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Intelligence Feed</h2>
              {intelStats.unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {['all', 'market', 'competitor', 'seo', 'opportunity', 'wordpress'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setIntelCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                    intelCategory === cat
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {cat === 'all' ? `All (${intelStats.total})` : `${CATEGORY_LABELS[cat]} (${intelStats.byCategory[cat] || 0})`}
                </button>
              ))}
            </div>

            {/* Intel cards */}
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredIntel.length === 0 ? (
                <div className="border border-zinc-800 rounded-xl p-6 text-center">
                  <div className="text-zinc-600 text-sm mb-3">No intel items yet</div>
                  <button
                    onClick={handleIntelRefresh}
                    disabled={refreshing}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Run a refresh to gather market signals
                  </button>
                </div>
              ) : (
                filteredIntel.map(item => (
                  <IntelCard key={item.id} item={item} onRead={handleIntelRead} onDelete={handleIntelDelete} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
