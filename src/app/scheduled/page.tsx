'use client';

import { useEffect, useState } from 'react';

interface CronJob {
  id: string;
  schedule: string;
  text: string;
  enabled: boolean;
  nextRun?: string;
  channel?: string;
}

interface RecurringTask {
  id: string;
  name: string;
  schedule: string;
  description: string;
  channel: string;
  model: string;
  enabled: boolean;
}

export default function ScheduledPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cron' | 'recurring'>('cron');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCronJobs();
    fetchRecurringTasks();
  }, []);

  const fetchCronJobs = async () => {
    try {
      const res = await fetch('/api/cron');
      if (res.ok) {
        const data = await res.json();
        setCronJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch cron jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringTasks = async () => {
    try {
      const res = await fetch('/api/recurring-tasks');
      if (res.ok) {
        const data = await res.json();
        setRecurringTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch recurring tasks:', err);
    }
  };

  const toggleJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/cron/${jobId}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchCronJobs();
      }
    } catch (err) {
      console.error('Failed to toggle job:', err);
    }
  };

  const runJobNow = async (jobId: string) => {
    try {
      const res = await fetch(`/api/cron/${jobId}/run`, { method: 'POST' });
      if (res.ok) {
        alert('Job triggered!');
      }
    } catch (err) {
      console.error('Failed to run job:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cron')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'cron'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Cron Jobs
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'recurring'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Recurring Tasks
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : activeTab === 'cron' ? (
          /* Cron Jobs List */
          <div className="space-y-3">
            {cronJobs.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-zinc-500">No cron jobs configured</p>
                <p className="text-zinc-600 text-sm mt-1">Add scheduled jobs in your Clawdbot config</p>
              </div>
            ) : (
              cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{job.text || job.id}</div>
                    <div className="text-zinc-500 text-sm flex items-center gap-3">
                      <span className="font-mono">{job.schedule}</span>
                      {job.nextRun && (
                        <span className="text-zinc-600">Next: {job.nextRun}</span>
                      )}
                    </div>
                  </div>
                  {job.channel && (
                    <div className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                      #{job.channel}
                    </div>
                  )}
                  <button
                    onClick={() => runJobNow(job.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
                  >
                    Run Now
                  </button>
                  <button
                    onClick={() => toggleJob(job.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      job.enabled ? 'bg-green-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        job.enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Recurring Tasks List */
          <div className="space-y-3">
            {recurringTasks.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-zinc-500">No recurring tasks</p>
                <p className="text-zinc-600 text-sm mt-1">Set up recurring work like daily reports</p>
              </div>
            ) : (
              recurringTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{task.name}</div>
                    <div className="text-zinc-500 text-sm">{task.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-600 text-xs font-mono">{task.schedule}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        task.model === 'opus' ? 'bg-purple-500/20 text-purple-400' :
                        task.model === 'sonnet' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {task.model}
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                    #{task.channel}
                  </div>
                  <button
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      task.enabled ? 'bg-green-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        task.enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2">About Scheduled Work</h3>
          <div className="text-zinc-500 text-sm space-y-2">
            <p>
              <strong className="text-zinc-400">Cron Jobs:</strong> Native Clawdbot cron jobs from your config. These fire on schedule and trigger the gateway.
            </p>
            <p>
              <strong className="text-zinc-400">Recurring Tasks:</strong> Regular work like daily reports, GSC/GA4 pulls, and summaries. Configure which channel gets notified and which model to use.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
