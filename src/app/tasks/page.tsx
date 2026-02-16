'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthWrapper';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  assigned_agent: string | null;
  what_doing: string | null;
  created_at: number;
  completed_at: number | null;
  session_id: string | null;
}

interface AgentInfo {
  id: string;
  name: string;
  color: string;
}

const agents: Record<string, AgentInfo> = {
  seo: { id: 'seo', name: 'SEO Agent', color: 'rgb(34, 197, 94)' },
  developer: { id: 'developer', name: 'Developer Agent', color: 'rgb(59, 130, 246)' },
  marketing: { id: 'marketing', name: 'Marketing Agent', color: 'rgb(239, 68, 68)' },
  content: { id: 'content', name: 'Content Agent', color: 'rgb(168, 85, 247)' },
};

// Lobster SVG path
const LobsterPath = () => (
  <path
    d="M50 10c-8 0-15 3-20 8l-5-3c-2-1-4 0-5 2s0 4 2 5l5 3c-2 5-2 11 0 16l-5 3c-2 1-3 3-2 5s3 3 5 2l5-3c5 5 12 8 20 8s15-3 20-8l5 3c2 1 4 0 5-2s0-4-2-5l-5-3c2-5 2-11 0-16l5-3c2-1 3-3 2-5s-3-3-5-2l-5 3c-5-5-12-8-20-8zm-8 15c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8zm16 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4zm-24 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4z"
  />
);

export default function TasksPage() {
  const { hasRole } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | string>('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'active' || filter === 'completed') {
          params.set('status', filter);
        } else {
          params.set('agent', filter);
        }
      }
      
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchTasks]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', msg: data.message || 'Task created' });
        setNewTaskTitle('');
        setShowCreateTask(false);
        fetchTasks();
      } else {
        setToast({ type: 'error', msg: data.error || 'Failed to create task' });
      }
    } catch (error) {
      setToast({ type: 'error', msg: 'Network error' });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ type: 'success', msg: 'Task deleted' });
        fetchTasks();
      } else {
        const data = await res.json();
        setToast({ type: 'error', msg: data.error || 'Failed to delete task' });
      }
    } catch (error) {
      setToast({ type: 'error', msg: 'Network error' });
    }
  };

  const formatTimeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getDuration = (created: number, completed?: number | null): string => {
    const end = completed || Date.now();
    const diff = end - created;
    if (diff < 60000) return '<1m';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStatusDot = (status: Task['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 animate-pulse';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  // Filter counts
  const allTasks = tasks;
  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Task-centric workflow with Porter orchestration
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-zinc-500">
              <div>{allTasks.length} total task{allTasks.length !== 1 ? 's' : ''}</div>
              <div>{activeTasks.length} active • {pendingTasks.length} pending</div>
            </div>
            {hasRole('edit') && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            All ({allTasks.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            Active ({activeTasks.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            Completed ({completedTasks.length})
          </button>
          
          {/* Agent filters */}
          <div className="border-l border-zinc-700 pl-2 ml-2">
            {Object.values(agents).map((agent) => {
              const agentTasks = tasks.filter(t => t.assigned_agent === agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => setFilter(agent.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap mr-2 ${
                    filter === agent.id
                      ? 'text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                  style={filter === agent.id ? { backgroundColor: agent.color } : {}}
                >
                  <svg className="w-3 h-3 inline mr-1" viewBox="0 0 100 100" fill="currentColor">
                    <LobsterPath />
                  </svg>
                  {agent.name.replace(' Agent', '')} ({agentTasks.length})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks Table */}
        {tasks.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Task Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Current Activity
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {tasks.map((task) => {
                    const agent = task.assigned_agent ? agents[task.assigned_agent] : null;
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => task.session_id && window.open(`/sessions/${task.session_id}`, '_blank')}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(task.status)}`} />
                            <div>
                              <div className="text-white font-medium">{task.title}</div>
                              {task.session_id && (
                                <Link 
                                  href={`/sessions/${task.session_id}`}
                                  className="text-xs text-orange-400 hover:text-orange-300"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Session →
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {agent ? (
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5" viewBox="0 0 100 100" style={{ color: agent.color }} fill="currentColor">
                                <LobsterPath />
                              </svg>
                              <span className="text-sm text-zinc-300">{agent.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {task.what_doing ? (
                            <span className="text-sm text-zinc-300 line-clamp-2">{task.what_doing}</span>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-zinc-400">{formatTimeAgo(task.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-zinc-400">{getDuration(task.created_at, task.completed_at)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {hasRole('admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                              title="Delete task"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-zinc-400 mb-1">
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </p>
            <p className="text-zinc-600 text-sm mb-4">
              {filter === 'all' ? 'Create your first task to get started' : 'Try a different filter'}
            </p>
            {hasRole('edit') && filter === 'all' && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
              >
                Create Task
              </button>
            )}
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateTask(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">New Task</h2>
              <p className="text-zinc-400 text-sm mt-1">Porter will automatically assign this to the best agent</p>
            </div>

            <div className="p-5">
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createTask();
                    if (e.key === 'Escape') setShowCreateTask(false);
                  }}
                  placeholder="e.g. Improve SEO rankings for blog posts"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => { setShowCreateTask(false); setNewTaskTitle(''); }}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTaskTitle.trim()}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}