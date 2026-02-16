'use client';

import { useEffect, useState } from 'react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  timezone: string | null;
  description: string;
  model: string;
  channel: string | null;
  enabled: boolean;
  nextRun: string | null;
  sessionTarget: string;
}

function formatNextRun(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs < 0) return 'overdue';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `in ${days}d ${hrs % 24}h`;
}

function channelName(raw: string | null): string {
  if (!raw) return '';
  const map: Record<string, string> = {
    'c0abz068w22': 'dailies',
    'c0ac4jz0m44': 'marketing',
    'c0acv8y8ahw': 'dev',
    'c0abkhh98vd': 'product',
    'c0ac11g4n4a': 'support',
    'c0ac06rawg2': 'social',
    'c0advjb9eta': 'projects',
    'c0acbtvcway': 'progress',
  };
  return map[raw.toLowerCase()] || raw;
}

export default function ScheduledPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/cron');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch cron jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduled Jobs</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-400 font-medium">No scheduled jobs</p>
            <p className="text-zinc-600 text-sm mt-1">Jobs are created via OpenClaw cron commands</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const next = formatNextRun(job.nextRun);
              const ch = channelName(job.channel);
              return (
                <div
                  key={job.id}
                  className={`bg-zinc-900 border rounded-xl p-5 transition-colors ${
                    job.enabled ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status dot */}
                    <div className="mt-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        job.enabled ? 'bg-green-400' : 'bg-zinc-600'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-medium">{job.name}</h3>
                        {!job.enabled && (
                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
                            disabled
                          </span>
                        )}
                      </div>

                      <p className="text-zinc-500 text-sm line-clamp-2 mb-3">
                        {job.description}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                          {job.schedule}
                        </span>
                        {job.timezone && (
                          <span className="text-zinc-600">{job.timezone}</span>
                        )}
                        {ch && (
                          <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                            #{ch}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded font-medium ${
                          job.model.includes('opus') ? 'bg-purple-500/15 text-purple-400' :
                          job.model.includes('sonnet') ? 'bg-blue-500/15 text-blue-400' :
                          'bg-green-500/15 text-green-400'
                        }`}>
                          {job.model}
                        </span>
                        {next && (
                          <span className="text-zinc-500 ml-auto">
                            Next: {next}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
