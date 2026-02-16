'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// Lobster SVG path for colored icons
const LobsterPath = () => (
  <path
    d="M50 10c-8 0-15 3-20 8l-5-3c-2-1-4 0-5 2s0 4 2 5l5 3c-2 5-2 11 0 16l-5 3c-2 1-3 3-2 5s3 3 5 2l5-3c5 5 12 8 20 8s15-3 20-8l5 3c2 1 4 0 5-2s0-4-2-5l-5-3c2-5 2-11 0-16l5-3c2-1 3-3 2-5s-3-3-5-2l-5 3c-5-5-12-8-20-8zm-8 15c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8zm16 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4zm-24 0c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4z"
  />
);

interface AgentDef {
  id: string;
  name: string;
  description: string | null;
  soul: string | null;
  model: string;
  skills: string;
  tools: string;
  color: string;
  icon: string;
  memory_dir: string | null;
  system_prompt: string | null;
  thinking: string;
  handoff_rules: string;
  enabled: boolean;
  spawn_count: number;
  created_at: number;
}

interface SessionInfo {
  key: string;
  sessionId?: string;
  displayName: string;
  status: 'active' | 'idle' | 'done';
  lastActive: string;
  model: string;
  totalTokens: number;
  messages: Array<{ role: string; content: string; timestamp: string }>;
}

const modelNames: Record<string, string> = {
  'claude-opus-4-20250514': 'Opus 4',
  'claude-opus-4-6': 'Opus 4',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-sonnet-4-5': 'Sonnet 4',
  'claude-sonnet-4-5-20250514': 'Sonnet 4',
  'claude-haiku-3-5-20241022': 'Haiku 3.5',
};

const iconMap: Record<string, string> = {
  bot: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  porter: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  megaphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  pencil: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  support: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
};

function formatModel(raw: string): string {
  const bare = raw.replace('anthropic/', '');
  return modelNames[bare] || bare;
}

function formatTimeAgo(ts: number | string): string {
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentDef | null>(null);
  const [spawning, setSpawning] = useState<string | null>(null);
  const [spawnTask, setSpawnTask] = useState('');
  const [spawnTarget, setSpawnTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', description: '', soul: '', model: 'claude-sonnet-4-20250514',
    icon: 'bot', color: '#f97316', thinking: 'low', system_prompt: '',
    skills: '', tools: '', handoff_rules: '', enabled: true,
  });

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, statusRes] = await Promise.all([
        fetch('/api/agents/definitions'),
        fetch('/api/status'),
      ]);
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setSessions(data.tasks?.allSessions || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const resetForm = () => {
    setForm({ name: '', description: '', soul: '', model: 'claude-sonnet-4-20250514', icon: 'bot', color: '#f97316', thinking: 'low', system_prompt: '', skills: '', tools: '', handoff_rules: '', enabled: true });
    setEditAgent(null);
  };

  const openEdit = (agent: AgentDef) => {
    setForm({
      name: agent.name,
      description: agent.description || '',
      soul: agent.soul || '',
      model: agent.model,
      icon: agent.icon,
      color: agent.color,
      thinking: agent.thinking,
      system_prompt: agent.system_prompt || '',
      skills: JSON.parse(agent.skills || '[]').join(', '),
      tools: JSON.parse(agent.tools || '[]').join(', '),
      handoff_rules: JSON.parse(agent.handoff_rules || '[]').join('\n'),
      enabled: agent.enabled,
    });
    setEditAgent(agent);
    setShowCreate(true);
  };

  const saveAgent = async () => {
    if (!form.name.trim()) return;

    const payload = {
      ...form,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      tools: form.tools.split(',').map(s => s.trim()).filter(Boolean),
      handoff_rules: form.handoff_rules.split('\n').map(s => s.trim()).filter(Boolean),
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
        setShowCreate(false);
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

  const deleteAgent = async (id: string) => {
    if (!confirm('Delete this agent definition?')) return;
    try {
      const res = await fetch(`/api/agents/definitions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ type: 'success', msg: 'Agent deleted' });
        fetchData();
      } else {
        setToast({ type: 'error', msg: 'Failed to delete' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error' });
    }
  };

  const spawnAgent = async (agentId: string, task?: string) => {
    setSpawning(agentId);
    try {
      const res = await fetch(`/api/agents/definitions/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', msg: data.message || 'Spawned' });
        setSpawnTarget(null);
        setSpawnTask('');
        setTimeout(fetchData, 3000);
      } else {
        setToast({ type: 'error', msg: data.error || 'Failed to spawn' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error' });
    } finally {
      setSpawning(null);
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
        fetchData(); // Refresh data
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

  // Group sessions by type
  const mainSessions = sessions.filter(s => s.key.includes('agent:main') && !s.key.includes('subagent:'));
  const subAgentSessions = sessions.filter(s => s.key.includes('subagent:') || s.key.includes('spawn:') || (s.key.includes('isolated') && !s.key.includes('cron')));
  const cronSessions = sessions.filter(s => s.key.includes('cron:'));
  const activeSessions = sessions.filter(s => s.status === 'active');
  const idleSessions = sessions.filter(s => s.status === 'idle');

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 animate-pulse';
      case 'idle': return 'bg-yellow-500';
      default: return 'bg-zinc-600';
    }
  };

  // Match agent definitions to running sessions (heuristic matching by name)
  const enrichedAgents = agents.map(agent => {
    const runningSessions = sessions.filter(s => 
      s.displayName.toLowerCase().includes(agent.name.toLowerCase()) ||
      s.key.toLowerCase().includes(agent.name.toLowerCase())
    );
    const activeSession = runningSessions.find(s => s.status === 'active');
    return {
      ...agent,
      isRunning: runningSessions.length > 0,
      activeSession,
      sessionCount: runningSessions.length,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading agents...</div>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Agents</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Define, manage, and spawn specialized agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-zinc-500">
              <div>{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}</div>
              <div>
                {agents.filter(a => a.enabled).length} active • {agents.filter(a => !a.enabled).length} inactive • {agents.length} total
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Agent</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Agent Cards Grid */}
        {enrichedAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {enrichedAgents.map((agent) => {
              const isPorter = agent.name === 'Porter' || agent.name.toLowerCase().includes('porter');
              const isDisabled = !agent.enabled;
              
              return (
                <div
                  key={agent.id}
                  className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                  style={isDisabled ? { filter: 'grayscale(1)' } : {}}
                >
                  {/* Color bar */}
                  <div className="h-1" style={{ backgroundColor: agent.color }} />

                  <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center relative"
                        style={{ backgroundColor: agent.color + '20' }}
                      >
                        <svg className="w-6 h-6" viewBox="0 0 100 100" style={{ color: agent.color }} fill="currentColor">
                          <LobsterPath />
                        </svg>
                        {agent.isRunning && (
                          <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${agent.activeSession ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">{agent.name}</h3>
                          {/* Status badge */}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            agent.enabled 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {agent.enabled ? 'Active' : 'Inactive'}
                          </span>
                          {/* Running session indicator */}
                          {agent.isRunning && agent.enabled && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              agent.activeSession 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {agent.activeSession ? 'Running' : 'Idle'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">{formatModel(agent.model)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Toggle switch or lock icon */}
                      {isPorter ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded" title="Porter is always active - routes tasks to specialist agents">
                          <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs text-zinc-400">Always Active</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleAgent(agent.id, agent.enabled)}
                          disabled={togglingAgent === agent.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out ${
                            agent.enabled ? 'bg-green-600' : 'bg-zinc-600'
                          } ${togglingAgent === agent.id ? 'opacity-50' : ''}`}
                          title={`${agent.enabled ? 'Disable' : 'Enable'} ${agent.name}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${
                            agent.enabled ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      )}
                      
                      {/* Edit/Delete buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(agent)}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {agent.description && (
                    <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{agent.description}</p>
                  )}

                  {agent.soul && (
                    <p className="text-zinc-500 text-xs italic mb-3 line-clamp-2">{agent.soul}</p>
                  )}

                  {/* Currently doing (if active) */}
                  {agent.activeSession && agent.activeSession.messages && agent.activeSession.messages.length > 0 && (
                    <div className="mb-3 p-2 bg-green-500/5 border border-green-500/20 rounded">
                      <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="5" />
                        </svg>
                        Currently working on:
                      </div>
                      <p className="text-zinc-300 text-xs line-clamp-2">
                        {agent.activeSession.messages[agent.activeSession.messages.length - 1].content}
                      </p>
                    </div>
                  )}

                  {/* Skills tags */}
                  {(() => {
                    const skills = JSON.parse(agent.skills || '[]');
                    return skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {skills.map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{s}</span>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-600">
                      {agent.spawn_count} spawn{agent.spawn_count !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      {spawnTarget === agent.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={spawnTask}
                            onChange={(e) => setSpawnTask(e.target.value)}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') spawnAgent(agent.id, spawnTask || undefined); 
                              if (e.key === 'Escape') { setSpawnTarget(null); setSpawnTask(''); } 
                            }}
                            placeholder="Task description..."
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-36 focus:outline-none focus:border-orange-500/50"
                            autoFocus
                          />
                          <button
                            onClick={() => spawnAgent(agent.id, spawnTask || undefined)}
                            disabled={spawning === agent.id}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white rounded text-xs font-medium transition-colors"
                            title="Spawn agent (task is optional)"
                          >
                            Go
                          </button>
                          <button
                            onClick={() => { setSpawnTarget(null); setSpawnTask(''); }}
                            className="px-1.5 py-1 text-zinc-500 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSpawnTarget(agent.id)}
                          disabled={spawning === agent.id || !agent.enabled}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            !agent.enabled ? 'cursor-not-allowed' : ''
                          }`}
                          style={{
                            backgroundColor: agent.enabled ? agent.color + '20' : '#3f3f46',
                            color: agent.enabled ? agent.color : '#71717a',
                          }}
                          title={
                            !agent.enabled 
                              ? 'Enable agent to spawn instances'
                              : 'Spawn a new instance of this agent in an isolated session'
                          }
                        >
                          {spawning === agent.id ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                          )}
                          Spawn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-12 text-center mb-8">
            <svg className="w-12 h-12 mx-auto text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <p className="text-zinc-400 mb-1">No agents defined yet</p>
            <p className="text-zinc-600 text-sm mb-4">Create your first specialized agent</p>
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
            >
              Create Agent
            </button>
          </div>
        )}

        {/* Live Sessions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Live Sessions
            <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 text-xs font-medium">
              {sessions.length} total
            </span>
            {activeSessions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                {activeSessions.length} active
              </span>
            )}
            {idleSessions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                {idleSessions.length} idle
              </span>
            )}
          </h2>

          {sessions.length > 0 ? (
            <div className="space-y-4">
              {/* Main session */}
              {mainSessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Main Session</h3>
                  <div className="space-y-1.5">
                    {mainSessions.map((s) => (
                      <SessionRow key={s.key} session={s} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sub-agents */}
              {subAgentSessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Sub-Agents & Isolated</h3>
                  <div className="space-y-1.5">
                    {subAgentSessions.map((s) => (
                      <SessionRow key={s.key} session={s} />
                    ))}
                  </div>
                </div>
              )}

              {/* Cron jobs */}
              {cronSessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Scheduled Tasks</h3>
                  <div className="space-y-1.5">
                    {cronSessions.map((s) => (
                      <SessionRow key={s.key} session={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 text-sm">No sessions found</div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                {editAgent ? `Edit ${editAgent.name}` : 'New Agent'}
              </h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Porter, Developer, Marketing"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this agent does"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Soul */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Soul / Personality</label>
                <textarea
                  value={form.soul}
                  onChange={(e) => setForm({ ...form, soul: e.target.value })}
                  placeholder="Who is this agent? Their personality, communication style, expertise..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Model + Thinking row */}
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Thinking</label>
                  <select
                    value={form.thinking}
                    onChange={(e) => setForm({ ...form, thinking: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="off">Off</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Icon + Color row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Icon</label>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="bot">Bot</option>
                    <option value="porter">Porter (Arrows)</option>
                    <option value="code">Code</option>
                    <option value="megaphone">Marketing</option>
                    <option value="shield">Shield</option>
                    <option value="pencil">Writer</option>
                    <option value="chart">Analytics</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g. github, wp-cli, coding-agent"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Handoff Rules */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Handoff Rules</label>
                <p className="text-xs text-zinc-500 mb-2">When should Porter hand tasks to this agent? List keywords, phrases, or patterns (one per line).</p>
                <textarea
                  value={form.handoff_rules}
                  onChange={(e) => setForm({ ...form, handoff_rules: e.target.value })}
                  placeholder={`reddit, social media, community engagement, subreddit\nanalyze competitors on reddit\npost to r/wordpress`}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">System Prompt (additional instructions)</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="Extra instructions for this agent..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAgent}
                disabled={!form.name.trim()}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editAgent ? 'Save Changes' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: SessionInfo }) {
  const badge = (() => {
    const m = session.model?.replace('anthropic/', '') || '';
    if (m.includes('opus')) return { bg: 'bg-purple-500/20 text-purple-400', name: 'Opus' };
    if (m.includes('sonnet')) return { bg: 'bg-blue-500/20 text-blue-400', name: 'Sonnet' };
    if (m.includes('haiku')) return { bg: 'bg-green-500/20 text-green-400', name: 'Haiku' };
    return { bg: 'bg-zinc-700 text-zinc-400', name: m || 'unknown' };
  })();

  const lastMsg = session.messages?.[session.messages.length - 1];
  const statusDot = session.status === 'active' ? 'bg-green-500 animate-pulse' : session.status === 'idle' ? 'bg-yellow-500' : 'bg-zinc-600';

  return (
    <Link
      href={session.sessionId ? `/sessions/${session.sessionId}` : '#'}
      className="flex items-start gap-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 p-3 transition-colors"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${statusDot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-sm font-medium truncate">{session.displayName}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${badge.bg}`}>{badge.name}</span>
          <span className="text-zinc-600 text-xs flex-shrink-0 ml-auto">{formatTimeAgo(session.lastActive)}</span>
        </div>
        {lastMsg && (
          <div className="text-zinc-500 text-xs line-clamp-2">
            {typeof lastMsg.content === 'string' 
              ? lastMsg.content.replace(/\n/g, ' ') 
              : JSON.stringify(lastMsg.content).substring(0, 100)}
          </div>
        )}
      </div>
    </Link>
  );
}
