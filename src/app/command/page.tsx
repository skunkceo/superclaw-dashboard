'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CronJobModal } from '@/components/CronJobModal';

interface Agent {
  id: string;
  name: string;
  role: string;
  skills: string[];
  active: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  product: string | null;
  area: string | null;
  assigned_agent: string | null;
  created_at: number;
}

interface RecurringTask {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  nextRun?: string;
  description?: string;
  model?: string | null;
}

interface Report {
  name: string;
  date: string;
  path: string;
  size: number;
}

export default function CommandPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'storage'>('tasks');
  const [selectedJob, setSelectedJob] = useState<RecurringTask | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/command');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setTasks(data.tasks || []);
        setRecurring(data.recurring || []);
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load command data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (jobId: string, updates: Partial<RecurringTask>) => {
    const res = await fetch('/api/cron/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, updates }),
    });

    if (!res.ok) {
      throw new Error('Failed to update job');
    }

    // Refresh data
    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Command Centre</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'team'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Team ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'storage'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Storage ({reports.length})
          </button>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Recurring Tasks */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Scheduled Jobs</h2>
              {recurring.length > 0 ? (
                <div className="space-y-2">
                  {recurring.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedJob(task)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${task.enabled ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        <div>
                          <div className="font-medium">{task.name}</div>
                          <div className="text-xs text-zinc-500">{task.schedule}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {task.nextRun && (
                          <span className="text-sm text-zinc-400">Next: {task.nextRun}</span>
                        )}
                        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">No scheduled jobs configured</p>
              )}
            </div>

            {/* Task Backlog */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Task Backlog</h2>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks
                    .sort((a, b) => {
                      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                             (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{task.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-zinc-600/20 text-zinc-400'
                              }`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                'bg-zinc-600/20 text-zinc-400'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-zinc-400 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            {task.assigned_agent && (
                              <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-400 rounded">
                                {task.assigned_agent}
                              </span>
                            )}
                            {task.product && (
                              <span className="text-xs text-zinc-500">{task.product}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-zinc-500">No tasks in backlog</p>
              )}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Agent Team</h2>
            {agents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-3 h-3 rounded-full ${agent.active ? 'bg-green-400' : 'bg-zinc-600'}`} />
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">{agent.role}</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500">No agents configured</p>
            )}
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Reports & Outputs</h2>
            {reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-xs text-zinc-500">{report.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{(report.size / 1024).toFixed(1)} KB</span>
                      <Link
                        href={report.path}
                        target="_blank"
                        className="px-3 py-1 text-sm bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500">No reports available</p>
            )}
          </div>
        )}
      </div>

      {/* Cron Job Modal */}
      <CronJobModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onSave={handleSaveJob}
      />
    </div>
  );
}
