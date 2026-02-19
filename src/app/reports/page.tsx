'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  timestamp: number;
  agent_label: string;
  action_type: string;
  summary: string;
  details: string | null;
  links: string;
  task_id: string | null;
  session_key: string | null;
}

interface Report {
  id: string;
  title: string;
  type: 'sprint' | 'research' | 'seo' | 'competitor' | 'content' | 'intelligence' | 'general';
  suggestion_id: string | null;
  overnight_run_id: string | null;
  created_at: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Action type config ───────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  started:    { label: 'Started',    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      dot: 'bg-blue-400' },
  completed:  { label: 'Completed',  color: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  blocked:    { label: 'Blocked',    color: 'bg-red-500/15 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
  error:      { label: 'Error',      color: 'bg-red-500/15 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
  commit:     { label: 'Commit',     color: 'bg-violet-500/15 text-violet-400 border-violet-500/30', dot: 'bg-violet-400' },
  pr_opened:  { label: 'PR',         color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  research:   { label: 'Research',   color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  analysis:   { label: 'Analysis',   color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  report:     { label: 'Report',     color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  content:    { label: 'Content',    color: 'bg-pink-500/15 text-pink-400 border-pink-500/30',      dot: 'bg-pink-400' },
  writing:    { label: 'Writing',    color: 'bg-pink-500/15 text-pink-400 border-pink-500/30',      dot: 'bg-pink-400' },
  outreach:   { label: 'Outreach',   color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',      dot: 'bg-teal-400' },
  audit:      { label: 'Audit',      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',      dot: 'bg-cyan-400' },
  sync:       { label: 'Sync',       color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',      dot: 'bg-cyan-400' },
  deploy:     { label: 'Deploy',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  info:       { label: 'Info',       color: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',         dot: 'bg-zinc-500' },
  // Regular background / monitoring jobs
  heartbeat:  { label: 'Heartbeat',  color: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',         dot: 'bg-zinc-600' },
  site_check: { label: 'Site check', color: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  intel:      { label: 'Intel',      color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
  cron:       { label: 'Cron job',   color: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',         dot: 'bg-zinc-500' },
  monitoring: { label: 'Monitoring', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',      dot: 'bg-cyan-400' },
  bug_fix:    { label: 'Bug fix',    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  check:      { label: 'Check',      color: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',         dot: 'bg-zinc-500' },
};

function getActionConfig(type: string) {
  return ACTION_CONFIG[type] || ACTION_CONFIG.info;
}

// ─── Agent label config ───────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  main:             'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'coding-agent':   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'content-agent':  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'seo-agent':      'bg-green-500/20 text-green-300 border-green-500/30',
  'research-agent': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'intel-cron':     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'check-in-cron':  'bg-zinc-500/20 text-zinc-300 border-zinc-700',
  'overnight-cron': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

function getAgentColor(label: string): string {
  for (const [key, val] of Object.entries(AGENT_COLORS)) {
    if (label === key || label.startsWith(key)) return val;
  }
  return 'bg-zinc-500/20 text-zinc-300 border-zinc-700';
}

function formatAgentLabel(label: string): string {
  if (label === 'main') return 'Clawd';
  return label.replace(/-/g, ' ');
}

// ─── Activity entry component ─────────────────────────────────────────────────

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const action = getActionConfig(entry.action_type);
  let links: { label: string; url: string }[] = [];
  try { links = JSON.parse(entry.links || '[]'); } catch { links = []; }

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center mt-1.5 shrink-0">
        <div className={`w-2 h-2 rounded-full ${action.dot} ring-2 ring-zinc-950`} />
        <div className="w-px flex-1 bg-zinc-800 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${action.color}`}>
            {action.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${getAgentColor(entry.agent_label)}`}>
            {formatAgentLabel(entry.agent_label)}
          </span>
          <span className="text-xs text-zinc-600 ml-auto shrink-0">
            {formatTime(entry.timestamp)} · {timeAgo(entry.timestamp)}
          </span>
        </div>

        <p className="text-base text-zinc-200 leading-snug">{entry.summary}</p>

        {entry.details && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-sm text-zinc-600 hover:text-zinc-400 mt-1 transition-colors"
          >
            {expanded ? '↑ hide details' : '↓ show details'}
          </button>
        )}

        {expanded && entry.details && (
          <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed whitespace-pre-wrap border-l border-zinc-800 pl-3">
            {entry.details}
          </p>
        )}

        {links.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ ts }: { ts: number }) {
  const today = new Date();
  const d = new Date(ts);
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDate(ts);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-sm text-zinc-600 font-medium">{label}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ─── Report type config ───────────────────────────────────────────────────────

const REPORT_TYPE_LABELS: Record<string, string> = {
  sprint: 'Sprint', research: 'Research', seo: 'SEO',
  competitor: 'Competitor', content: 'Content', intelligence: 'Intelligence', general: 'General',
};
const REPORT_TYPE_COLORS: Record<string, string> = {
  sprint: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  research: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  seo: 'bg-green-500/15 text-green-400 border-green-500/30',
  competitor: 'bg-red-500/15 text-red-400 border-red-500/30',
  content: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  intelligence: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  general: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<'activity' | 'reports'>('activity');

  // Activity state
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportTypeFilter, setReportTypeFilter] = useState('all');

  const fetchActivity = useCallback(() => {
    setActivityLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (agentFilter !== 'all') params.set('agent', agentFilter);
    if (actionFilter !== 'all') params.set('type', actionFilter);
    fetch(`/api/activity?${params}`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setActivityLoading(false); })
      .catch(() => setActivityLoading(false));
  }, [agentFilter, actionFilter]);

  const fetchReports = useCallback(() => {
    setReportsLoading(true);
    fetch('/api/reports?limit=100')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setReportsLoading(false); })
      .catch(() => setReportsLoading(false));
  }, []);

  useEffect(() => { if (tab === 'activity') fetchActivity(); }, [tab, fetchActivity]);
  useEffect(() => { if (tab === 'reports') fetchReports(); }, [tab, fetchReports]);

  // Group activity entries by date
  const grouped: { date: string; ts: number; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const dateStr = new Date(entry.timestamp).toDateString();
    if (!grouped.length || grouped[grouped.length - 1].date !== dateStr) {
      grouped.push({ date: dateStr, ts: entry.timestamp, entries: [entry] });
    } else {
      grouped[grouped.length - 1].entries.push(entry);
    }
  }

  const allAgents = Array.from(new Set(entries.map(e => e.agent_label)));
  const allActions = Array.from(new Set(entries.map(e => e.action_type)));
  const filteredReports = reportTypeFilter === 'all' ? reports : reports.filter(r => r.type === reportTypeFilter);
  const reportTypes = Array.from(new Set(reports.map(r => r.type)));

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Activity</h1>
            <p className="text-base text-zinc-500 mt-1">
              Everything Clawd and sub-agents have been doing
            </p>
          </div>
          {tab === 'activity' && (
            <button
              onClick={fetchActivity}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
            >
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setTab('activity')}
            className={`px-4 py-3 text-base font-medium transition-colors border-b-2 -mb-px ${
              tab === 'activity'
                ? 'text-white border-orange-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Activity log
            {entries.length > 0 && (
              <span className="ml-2 text-sm text-zinc-600">{entries.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`px-4 py-3 text-base font-medium transition-colors border-b-2 -mb-px ${
              tab === 'reports'
                ? 'text-white border-orange-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Reports
            {reports.length > 0 && (
              <span className="ml-2 text-sm text-zinc-600">{reports.length}</span>
            )}
          </button>
        </div>

        {/* ── Activity tab ── */}
        {tab === 'activity' && (
          <>
            {/* Filters */}
            {(allAgents.length > 0 || allActions.length > 0) && (
              <div className="flex flex-col gap-3 mb-6">
                {allAgents.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className="text-xs text-zinc-600 w-8 shrink-0">Agent</span>
                    <button
                      onClick={() => setAgentFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${agentFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      All
                    </button>
                    {allAgents.map(a => (
                      <button
                        key={a}
                        onClick={() => setAgentFilter(a)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${agentFilter === a ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {formatAgentLabel(a)}
                      </button>
                    ))}
                  </div>
                )}
                {allActions.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className="text-xs text-zinc-600 w-8 shrink-0">Type</span>
                    <button
                      onClick={() => setActionFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${actionFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      All
                    </button>
                    {allActions.map(a => (
                      <button
                        key={a}
                        onClick={() => setActionFilter(a)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${actionFilter === a ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {getActionConfig(a).label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {activityLoading ? (
              <div className="text-center py-16 text-zinc-600 text-sm">Loading activity...</div>
            ) : entries.length === 0 ? (
              <div className="border border-zinc-800 rounded-xl p-16 text-center">
                <div className="text-zinc-600 text-base mb-2">No activity yet</div>
                <p className="text-sm text-zinc-700">
                  Activity is logged as Clawd and sub-agents work. Check back after the next task.
                </p>
              </div>
            ) : (
              <div>
                {grouped.map((group) => (
                  <div key={group.date}>
                    <DateSeparator ts={group.ts} />
                    <div className="mt-3">
                      {group.entries.map(entry => (
                        <ActivityItem key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <>
            {reportTypes.length > 0 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                <button
                  onClick={() => setReportTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${reportTypeFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  All ({reports.length})
                </button>
                {reportTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setReportTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${reportTypeFilter === type ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {REPORT_TYPE_LABELS[type] || type} ({reports.filter(r => r.type === type).length})
                  </button>
                ))}
              </div>
            )}

            {reportsLoading ? (
              <div className="text-center py-16 text-zinc-600 text-sm">Loading reports...</div>
            ) : filteredReports.length === 0 ? (
              <div className="border border-zinc-800 rounded-xl p-16 text-center">
                <div className="text-zinc-600 text-base mb-2">No reports yet</div>
                <p className="text-sm text-zinc-700">
                  Reports are generated when Clawd completes overnight tasks or research runs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map(report => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl p-5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${REPORT_TYPE_COLORS[report.type] || REPORT_TYPE_COLORS.general}`}>
                        {REPORT_TYPE_LABELS[report.type] || report.type}
                      </span>
                      <span className="text-xs text-zinc-600">{timeAgo(report.created_at)}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors leading-snug mb-2">
                      {report.title}
                    </h3>
                    <div className="text-sm text-zinc-600">{formatDate(report.created_at)}</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
