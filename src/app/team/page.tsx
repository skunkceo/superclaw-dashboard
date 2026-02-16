'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  role: string;
  skills: string[];
  active: boolean;
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/command');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
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

  // Sort agents: Clawd first, Porter second, then alphabetically
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.name === 'Clawd') return -1;
    if (b.name === 'Clawd') return 1;
    if (a.name === 'Porter') return -1;
    if (b.name === 'Porter') return 1;
    return a.name.localeCompare(b.name);
  });

  // Separate Clawd & Porter from others
  const primaryAgents = sortedAgents.filter(a => a.name === 'Clawd' || a.name === 'Porter');
  const otherAgents = sortedAgents.filter(a => a.name !== 'Clawd' && a.name !== 'Porter');

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Agent Team</h1>
        </div>

        {agents.length > 0 ? (
          <div className="space-y-6">
            {/* Primary Agents (Clawd & Porter) */}
            {primaryAgents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {primaryAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-5 bg-zinc-900 rounded-xl border border-zinc-700 hover:border-orange-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${agent.active ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                      </div>
                      <Link
                        href={`/workspace?agent=${agent.id}`}
                        className="px-3 py-1 text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                      >
                        Edit Agent
                      </Link>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">{agent.role}</p>
                    <div className="flex flex-wrap gap-2">
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
            )}

            {/* Other Agents (4 per row) */}
            {otherAgents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {otherAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${agent.active ? 'bg-green-400' : 'bg-zinc-600'}`} />
                      <h3 className="font-semibold">{agent.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">{agent.role}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {agent.skills.length > 3 && (
                        <span className="px-1.5 py-0.5 text-xs text-zinc-500">
                          +{agent.skills.length - 3}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/workspace?agent=${agent.id}`}
                      className="block w-full text-center px-2 py-1 text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <p className="text-zinc-500">No agents configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
