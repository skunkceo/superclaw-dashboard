'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Agent {
  label: string;
  name: string;
  emoji: string;
  description: string;
  isPro: boolean;
  status: string;
  messageCount: number;
  lastActive: string;
  model: string | null;
  memory: {
    size: string;
    bytes: number;
    files: string[];
  };
}

export default function AgentDetailPage() {
  const params = useParams();
  const label = params?.label as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'memory' | 'config'>('memory');

  useEffect(() => {
    if (!label) return;

    fetch(`/api/agents/${label}`)
      .then(res => {
        if (!res.ok) throw new Error('Agent not found');
        return res.json();
      })
      .then(data => {
        setAgent(data.agent);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [label]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Agent not found</h2>
          <Link href="/agents" className="text-orange-400 hover:text-orange-300">
            ← Back to agents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/agents" className="text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-3xl">{agent.emoji}</span>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            {agent.isPro && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                PRO
              </span>
            )}
            <span className={`px-2 py-1 rounded text-xs ml-auto ${
              agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
              agent.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-zinc-700 text-zinc-400'
            }`}>
              {agent.status}
            </span>
          </div>
          
          {agent.description && (
            <p className="text-zinc-400 mb-4">{agent.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="px-2 py-1 bg-zinc-800 rounded font-mono">{agent.label}</span>
            {agent.lastActive !== 'never' && (
              <>
                <span>•</span>
                <span>Last active {agent.lastActive}</span>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400 mb-1">Messages</div>
            <div className="text-2xl font-bold">{agent.messageCount}</div>
            <div className="text-xs text-zinc-500 mt-1">in current session</div>
          </div>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400 mb-1">Memory Size</div>
            <div className="text-2xl font-bold">{agent.memory.size}</div>
            <div className="text-xs text-zinc-500 mt-1">{agent.memory.files.length} files</div>
          </div>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400 mb-1">Model</div>
            <div className="text-lg font-bold font-mono">
              {agent.model ? agent.model.replace('claude-', '') : 'Not active'}
            </div>
          </div>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400 mb-1">Status</div>
            <div className="text-lg font-bold capitalize">{agent.status}</div>
            {agent.lastActive !== 'never' && (
              <div className="text-xs text-zinc-500 mt-1">{agent.lastActive}</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="border-b border-zinc-800 flex">
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'memory' 
                  ? 'text-orange-400 border-b-2 border-orange-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Memory Files
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'config' 
                  ? 'text-orange-400 border-b-2 border-orange-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Configuration
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'memory' && (
              <div className="space-y-2">
                {agent.memory.files.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    No memory files yet
                  </div>
                ) : (
                  agent.memory.files.map((file: string) => (
                    <div
                      key={file}
                      className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-800/70 transition"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-mono text-sm">{file}</span>
                      </div>
                      <Link
                        href={`/memory?agent=${agent.label}&file=${file}`}
                        className="text-orange-400 hover:text-orange-300 text-sm"
                      >
                        View →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="text-sm text-zinc-400 mb-2">Agent Label</div>
                  <div className="font-mono text-white">{agent.label}</div>
                </div>
                
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="text-sm text-zinc-400 mb-2">Display Name</div>
                  <div className="text-white">{agent.emoji} {agent.name}</div>
                </div>
                
                {agent.isPro && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                      </svg>
                      <div className="text-sm text-orange-400 font-medium">Specialized Agent (Pro)</div>
                    </div>
                    <div className="text-sm text-zinc-300">
                      This agent has access to specialized workflows, repository-scoped workspaces, and ephemeral sandboxes.
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="text-sm text-zinc-400 mb-2">Description</div>
                  <div className="text-white">{agent.description || 'No description'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
