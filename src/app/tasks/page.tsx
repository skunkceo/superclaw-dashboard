'use client';

import { useEffect, useState } from 'react';

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/command');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setRecurring(data.recurring || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold mb-6">Tasks</h1>

        {/* Scheduled Jobs */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Scheduled Jobs</h2>
          {recurring.length > 0 ? (
            <div className="space-y-2">
              {recurring.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${task.enabled ? 'bg-green-400' : 'bg-zinc-600'}`} />
                    <div>
                      <div className="font-medium">{task.name}</div>
                      <div className="text-xs text-zinc-500">{task.schedule}</div>
                    </div>
                  </div>
                  {task.nextRun && (
                    <span className="text-sm text-zinc-400">Next: {task.nextRun}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No scheduled jobs configured</p>
          )}
        </div>

        {/* Task Backlog */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Backlog</h2>
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
    </div>
  );
}
