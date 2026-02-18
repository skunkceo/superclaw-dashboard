'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Report {
  id: string;
  title: string;
  type: 'sprint' | 'research' | 'seo' | 'competitor' | 'content' | 'intelligence' | 'general';
  suggestion_id: string | null;
  overnight_run_id: string | null;
  created_at: number;
}

const TYPE_LABELS: Record<string, string> = {
  sprint: 'Sprint',
  research: 'Research',
  seo: 'SEO',
  competitor: 'Competitor',
  content: 'Content',
  intelligence: 'Intelligence',
  general: 'General',
};

const TYPE_COLORS: Record<string, string> = {
  sprint: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  research: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  seo: 'bg-green-500/15 text-green-400 border-green-500/30',
  competitor: 'bg-red-500/15 text-red-400 border-red-500/30',
  content: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  intelligence: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  general: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetch('/api/reports?limit=100')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = typeFilter === 'all' ? reports : reports.filter(r => r.type === typeFilter);
  const types = Array.from(new Set(reports.map(r => r.type)));

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Output from overnight runs, research, and Clawd&apos;s autonomous work
            </p>
          </div>
          <Link
            href="/proactivity"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
          >
            Back to Proactivity
          </Link>
        </div>

        {/* Type filters */}
        {types.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All ({reports.length})
            </button>
            {types.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === type ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {TYPE_LABELS[type] || type} ({reports.filter(r => r.type === type).length})
              </button>
            ))}
          </div>
        )}

        {/* Reports grid */}
        {loading ? (
          <div className="text-center py-16 text-zinc-600 text-sm">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl p-16 text-center">
            <div className="text-zinc-600 text-sm mb-2">No reports yet</div>
            <p className="text-xs text-zinc-700">
              Reports are generated when Clawd completes overnight tasks. Start by approving some suggestions and running overnight mode.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(report => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[report.type] || TYPE_COLORS.general}`}>
                    {TYPE_LABELS[report.type] || report.type}
                  </span>
                  <span className="text-xs text-zinc-600">{timeAgo(report.created_at)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors leading-snug mb-2">
                  {report.title}
                </h3>
                <div className="text-xs text-zinc-600">{formatDate(report.created_at)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
