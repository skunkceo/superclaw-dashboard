'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CronJobModal } from '@/components/CronJobModal';

// Lobster SVG for team member icons
const LobsterPath = () => (
  <path
    d="M50 10c-8 0-15 3-20 8l-5-3c-2-1-4 0-5 2s0 4 2 5l5 3c-2 5-2 11 0 16l-5 3c-2 1-3 3-2 5s3 3 5 2l5-3c5 5 12 8 20 8s15-3 20-8l5 3c2 1 4 0 5-2s0-4-2-5l-5-3c2-5 2-11 0-16l5-3c2-1 3-3 2-5s-3-3-5-2l-5 3c-5-5-12-8-20-8zm-8 15c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8zm16 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4zm-24 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4z"
  />
);

interface Agent {
  id: string;
  name: string;
  role: string;
  skills: string[];
  active: boolean;
  color?: string;
  icon?: string;
  soul?: string;
  handoff_rules?: string[];
  spawn_count?: number;
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

interface MainAssistant {
  name: string;
  soul: string;
  identity: string;
}

export default function CommandPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [mainAssistant, setMainAssistant] = useState<MainAssistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'storage'>('team');
  const [selectedJob, setSelectedJob] = useState<RecurringTask | null>(null);
  const [showAgentDetail, setShowAgentDetail] = useState<Agent | null>(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);

  // Form state for agent creation/editing
  const [form, setForm] = useState({
    name: '',
    role: '',
    soul: '',
    model: 'claude-sonnet-4-20250514',
    icon: 'bot',
    color: '#f97316',
    thinking: 'low',
    skills: '',
    handoff_rules: '',
    enabled: true,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/command');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setTasks(data.tasks || []);
        setRecurring(data.recurring || []);
        setReports(data.reports || []);
        
        // Load main assistant info from workspace files
        try {
          const soulRes = await fetch('/api/workspace/files?path=SOUL.md');
          const identityRes = await fetch('/api/workspace/files?path=IDENTITY.md');
          
          const soulData = soulRes.ok ? await soulRes.json() : null;
          const identityData = identityRes.ok ? await identityRes.json() : null;
          
          if (soulData || identityData) {
            setMainAssistant({
              name: 'Clawd', // TODO: Read from identity
              soul: soulData?.content || 'Your primary AI cofounder',
              identity: identityData?.content || '',
            });
          }
        } catch (err) {
          console.error('Failed to load main assistant info:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load command data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSaveJob = async (jobId: string, updates: Partial<RecurringTask>) => {
    const res = await fetch('/api/cron/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, updates }),
    });

    if (!res.ok) {
      throw new Error('Failed to update job');
    }

    await fetchData();
  };

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      soul: '',
      model: 'claude-sonnet-4-20250514',
      icon: 'bot',
      color: '#f97316',
      thinking: 'low',
      skills: '',
      handoff_rules: '',
      enabled: true,
    });
    setEditAgent(null);
  };

  const openEdit = (agent: Agent) => {
    setForm({
      name: agent.name,
      role: agent.role,
      soul: agent.soul || '',
      model: 'claude-sonnet-4-20250514', // TODO: Get from agent
      icon: agent.icon || 'bot',
      color: agent.color || '#f97316',
      thinking: 'low',
      skills: agent.skills.join(', '),
      handoff_rules: (agent.handoff_rules || []).join('\n'),
      enabled: agent.active,
    });
    setEditAgent(agent);
    setShowCreateAgent(true);
  };

  const saveAgent = async () => {
    if (!form.name.trim()) return;

    const payload = {
      name: form.name,
      description: form.role,
      soul: form.soul,
      model: form.model,
      icon: form.icon,
      color: form.color,
      thinking: form.thinking,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      handoff_rules: form.handoff_rules.split('\n').map(s => s.trim()).filter(Boolean),
      enabled: form.enabled,
    };

    try {
      const url = editAgent ? `/api/agents/definitions/${editAgent.id}` : '/api/agents/definitions';
      const method = editAgent ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast({ type: 'success', msg: editAgent ? 'Agent updated' : 'Agent created' });
        setShowCreateAgent(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        setToast({ type: 'error', msg: data.error || 'Failed' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error' });
    }
  };

  const toggleAgent = async (agentId: string, currentState: boolean) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Check if trying to disable Porter
    if (!currentState && (agent.name === 'Porter' || agent.name.toLowerCase().includes('porter'))) {
      setToast({ type: 'error', msg: 'Porter cannot be disabled - it routes tasks to specialist agents' });
      return;
    }

    setTogglingAgent(agentId);
    try {
      const res = await fetch(`/api/agents/definitions/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentState }),
      });
      
      if (res.ok) {
        setToast({ type: 'success', msg: `${agent.name} ${!currentState ? 'enabled' : 'disabled'}` });
        fetchData();
      } else {
        const data = await res.json();
        setToast({ type: 'error', msg: data.error || 'Failed to toggle agent' });
      }
    } catch (error) {
      setToast({ type: 'error', msg: 'Network error' });
    } finally {
      setTogglingAgent(null);
    }
  };

  // Separate Porter and specialists
  const porter = agents.find(a => a.name.toLowerCase().includes('porter'));
  const specialists = agents.filter(a => !a.name.toLowerCase().includes('porter'));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-3xl font-bold mb-6">Command Centre</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'team'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Your Team ({agents.length})
          </button>
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

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Main Assistant */}
            {mainAssistant && (
              <div className="bg-gradient-to-br from-orange-500/10 to-zinc-900 border border-orange-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-orange-400" viewBox="0 0 100 100" fill="currentColor">
                      <LobsterPath />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{mainAssistant.name}</h2>
                    <p className="text-orange-400 text-sm">Your Primary AI Cofounder</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Link
                      href="/workspace"
                      className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Identity
                    </Link>
                    <Link
                      href="/workspace"
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit Soul
                    </Link>
                  </div>
                </div>
                <p className="text-zinc-300 text-sm line-clamp-3">{mainAssistant.soul}</p>
              </div>
            )}

            {/* Porter (Orchestrator) */}
            {porter && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Orchestrator</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: porter.color + '20' }}
                      >
                        <svg className="w-8 h-8" viewBox="0 0 100 100" style={{ color: porter.color }} fill="currentColor">
                          <LobsterPath />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-white">{porter.name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                            Always Active
                          </span>
                          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p className="text-zinc-400 text-sm">{porter.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600">{porter.spawn_count || 0} tasks routed</span>
                      <button
                        onClick={() => setShowAgentDetail(porter)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openEdit(porter)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Specialists */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-400">
                  Specialists ({specialists.filter(a => a.active).length} active, {specialists.filter(a => !a.active).length} inactive)
                </h3>
                <button
                  onClick={() => { resetForm(); setShowCreateAgent(true); }}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Specialist
                </button>
              </div>

              {specialists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialists.map((agent) => (
                    <div
                      key={agent.id}
                      className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group ${
                        !agent.active ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      {/* Color bar */}
                      <div className="h-1" style={{ backgroundColor: agent.color || '#f97316' }} />

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setShowAgentDetail(agent)}>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: (agent.color || '#f97316') + '20' }}
                            >
                              <svg className="w-6 h-6" viewBox="0 0 100 100" style={{ color: agent.color || '#f97316' }} fill="currentColor">
                                <LobsterPath />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-white font-semibold hover:text-orange-400 transition-colors">{agent.name}</h4>
                              <span className="text-xs text-zinc-500">{agent.spawn_count || 0} spawns</span>
                            </div>
                          </div>

                          {/* Toggle + actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleAgent(agent.id, agent.active)}
                              disabled={togglingAgent === agent.id}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                                agent.active ? 'bg-green-600' : 'bg-zinc-600'
                              }`}
                              title={`${agent.active ? 'Disable' : 'Enable'} ${agent.name}`}
                            >
                              <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition ${
                                agent.active ? 'translate-x-4' : 'translate-x-1'
                              }`} />
                            </button>

                            <button
                              onClick={() => openEdit(agent)}
                              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{agent.role}</p>

                        {agent.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {agent.skills.slice(0, 3).map((skill) => (
                              <span key={skill} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{skill}</span>
                            ))}
                            {agent.skills.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-xs">+{agent.skills.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
                  <p className="text-zinc-400 mb-1">No specialists yet</p>
                  <p className="text-zinc-600 text-sm">Create your first specialist agent</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Scheduled Jobs */}
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

        {/* STORAGE TAB */}
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

      {/* Agent Detail Modal */}
      {showAgentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAgentDetail(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: (showAgentDetail.color || '#f97316') + '20' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 100 100" style={{ color: showAgentDetail.color || '#f97316' }} fill="currentColor">
                    <LobsterPath />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{showAgentDetail.name}</h2>
                  <p className="text-zinc-400 text-sm">{showAgentDetail.role}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {showAgentDetail.soul && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">Personality</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{showAgentDetail.soul}</p>
                </div>
              )}

              {showAgentDetail.handoff_rules && showAgentDetail.handoff_rules.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">Handoff Rules</h3>
                  <div className="flex flex-wrap gap-2">
                    {showAgentDetail.handoff_rules.map((rule, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {showAgentDetail.skills.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-1">
                    {showAgentDetail.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowAgentDetail(null)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Agent Modal */}
      {showCreateAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateAgent(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                {editAgent ? `Edit ${editAgent.name}` : 'New Specialist'}
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. SEO, Developer, Marketing"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Role / Description</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="What this agent does"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g. SEO, Content, Analytics"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Handoff Rules (one per line)</label>
                <textarea
                  value={form.handoff_rules}
                  onChange={(e) => setForm({ ...form, handoff_rules: e.target.value })}
                  placeholder="Keywords/phrases that trigger assignment to this agent"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Model</label>
                  <select
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="claude-sonnet-4-20250514">Sonnet 4</option>
                    <option value="claude-haiku-3-5-20241022">Haiku 3.5</option>
                    <option value="claude-opus-4-20250514">Opus 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Personality (optional - auto-generated if empty)</label>
                <textarea
                  value={form.soul}
                  onChange={(e) => setForm({ ...form, soul: e.target.value })}
                  placeholder="Leave blank to auto-generate based on name and role"
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => { setShowCreateAgent(false); resetForm(); }}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAgent}
                disabled={!form.name.trim()}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editAgent ? 'Save Changes' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cron Job Modal */}
      <CronJobModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onSave={handleSaveJob}
      />
    </div>
  );
}
