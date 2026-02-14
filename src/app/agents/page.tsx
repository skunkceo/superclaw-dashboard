'use client';

import { useEffect, useState, useCallback } from 'react';

interface MainAgent {
  status: 'idle' | 'processing' | 'thinking';
  activity: string;
  lastActive: number;
  model?: string;
  sessionTokens?: number;
}

interface SubAgent {
  sessionKey: string;
  label?: string;
  task?: string;
  model?: string;
  status: 'running' | 'completed' | 'error';
  startedAt?: string;
  lastMessage?: string;
}

interface QueueItem {
  id: number;
  title: string;
  priority: string;
  product?: string;
  area?: string;
  status: string;
  created_at: number;
}

interface OperationsData {
  mainAgent: MainAgent;
  queue: {
    backlog: number;
    inProgress: number;
    items: QueueItem[];
  };
  agents: {
    active: number;
    maxConcurrent: number;
    sessions: SubAgent[];
  };
  recommendations: string[];
}

export default function AgentsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spawning, setSpawning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch operations data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  const spawnAgent = async () => {
    if (!data || data.agents.active >= data.agents.maxConcurrent) return;
    
    setSpawning(true);
    try {
      const res = await fetch('/api/agents/spawn', { method: 'POST' });
      if (res.ok) {
        // Refresh data after spawn
        setTimeout(fetchData, 2000);
      }
    } catch (err) {
      console.error('Failed to spawn agent:', err);
    } finally {
      setSpawning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-zinc-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'low': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-zinc-500">
            Failed to load operations data
          </div>
        ) : (
          <>
            {/* Main Agent Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    data.mainAgent.status === 'processing' ? 'bg-green-500/20' :
                    data.mainAgent.status === 'thinking' ? 'bg-yellow-500/20' :
                    'bg-zinc-800'
                  }`}>
                    <svg className={`w-7 h-7 ${
                      data.mainAgent.status === 'processing' ? 'text-green-400 animate-pulse' :
                      data.mainAgent.status === 'thinking' ? 'text-yellow-400' :
                      'text-zinc-500'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-white font-semibold text-lg">Main Agent</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        data.mainAgent.status === 'processing' ? 'bg-green-500/20 text-green-400' :
                        data.mainAgent.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {data.mainAgent.status === 'processing' ? 'Processing' :
                         data.mainAgent.status === 'thinking' ? 'Thinking' : 'Idle'}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm mt-1 max-w-md truncate">
                      {data.mainAgent.activity}
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      Last active: {formatTimeAgo(data.mainAgent.lastActive)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {data.mainAgent.model && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      data.mainAgent.model.includes('opus') ? 'bg-purple-500/20 text-purple-400' :
                      data.mainAgent.model.includes('sonnet') ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {data.mainAgent.model.includes('opus') ? 'Opus' :
                       data.mainAgent.model.includes('sonnet') ? 'Sonnet' : 
                       data.mainAgent.model.split('-').pop()}
                    </span>
                  )}
                  {data.mainAgent.sessionTokens && (
                    <p className="text-zinc-600 text-xs mt-2">
                      {(data.mainAgent.sessionTokens / 1000).toFixed(0)}k tokens
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-sm mb-1">Queue Backlog</div>
                <div className="text-3xl font-bold text-white">{data.queue.backlog}</div>
                <div className="text-zinc-600 text-xs mt-1">tasks waiting</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-sm mb-1">In Progress</div>
                <div className="text-3xl font-bold text-orange-400">{data.queue.inProgress}</div>
                <div className="text-zinc-600 text-xs mt-1">being worked on</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-sm mb-1">Active Agents</div>
                <div className="text-3xl font-bold text-green-400">
                  {data.agents.active}
                  <span className="text-zinc-600 text-lg font-normal">/{data.agents.maxConcurrent}</span>
                </div>
                <div className="text-zinc-600 text-xs mt-1">sub-agents running</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-sm mb-1">Capacity</div>
                <div className={`text-3xl font-bold ${
                  data.agents.active < data.agents.maxConcurrent ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {data.agents.maxConcurrent - data.agents.active}
                </div>
                <div className="text-zinc-600 text-xs mt-1">slots available</div>
              </div>
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Recommendations
                </h3>
                <ul className="space-y-1">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
                {data.agents.active < data.agents.maxConcurrent && data.queue.backlog > 0 && (
                  <button
                    onClick={spawnAgent}
                    disabled={spawning}
                    className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    {spawning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Spawning...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Spawn Agent
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Agents */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="p-4 border-b border-zinc-800">
                  <h2 className="text-white font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Active Sub-Agents
                  </h2>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {data.agents.sessions.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <svg className="w-12 h-12 mx-auto text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <p>No active sub-agents</p>
                      <p className="text-xs text-zinc-600 mt-1">Agents spawn when work is picked up</p>
                    </div>
                  ) : (
                    data.agents.sessions.map((agent) => (
                      <div key={agent.sessionKey} className="bg-zinc-800/50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                            <span className="text-white font-medium text-sm">
                              {agent.label || agent.sessionKey.slice(0, 12)}
                            </span>
                          </div>
                          {agent.model && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              agent.model.includes('opus') ? 'bg-purple-500/20 text-purple-400' :
                              agent.model.includes('sonnet') ? 'bg-blue-500/20 text-blue-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {agent.model.includes('opus') ? 'Opus' :
                               agent.model.includes('sonnet') ? 'Sonnet' : 'Haiku'}
                            </span>
                          )}
                        </div>
                        {agent.task && (
                          <p className="text-zinc-400 text-sm line-clamp-2">{agent.task}</p>
                        )}
                        {agent.lastMessage && (
                          <p className="text-zinc-500 text-xs mt-2 line-clamp-1 italic">
                            Last: {agent.lastMessage}
                          </p>
                        )}
                        {agent.startedAt && (
                          <p className="text-zinc-600 text-xs mt-1">
                            Started: {agent.startedAt}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Work Queue */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="p-4 border-b border-zinc-800">
                  <h2 className="text-white font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Work Queue
                  </h2>
                </div>
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {data.queue.items.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <svg className="w-12 h-12 mx-auto text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>Queue is empty</p>
                      <p className="text-xs text-zinc-600 mt-1">Add work via chat or HEARTBEAT</p>
                    </div>
                  ) : (
                    data.queue.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800/50">
                        <div className={`w-1 self-stretch rounded-full ${
                          item.priority === 'critical' ? 'bg-red-500' :
                          item.priority === 'high' ? 'bg-orange-500' :
                          item.priority === 'medium' ? 'bg-blue-500' : 'bg-zinc-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">{item.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs border ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                            {item.product && (
                              <span className="text-zinc-600 text-xs">{item.product}</span>
                            )}
                            <span className="text-zinc-700 text-xs">{formatTimeAgo(item.created_at)}</span>
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          item.status === 'in_progress' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {item.status === 'in_progress' ? 'Active' : 'Queued'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
