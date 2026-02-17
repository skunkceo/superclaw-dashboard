'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Agent {
  label: string;
  name: string;
  emoji: string;
  description: string;
  isPro: boolean;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents/list')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-48 mb-6"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-32 bg-zinc-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Agents</h1>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No agents configured</h2>
            <p className="text-zinc-400 mb-6">
              Run <code className="px-2 py-1 bg-zinc-800 rounded text-orange-400">superclaw setup agents</code> to get started
            </p>
            <Link
              href="https://docs.openclaw.ai/superclaw/setup"
              target="_blank"
              className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
            >
              View Setup Guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const standardAgents = agents.filter(a => !a.isPro);
  const specializedAgents = agents.filter(a => a.isPro);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Agents</h1>
          <Link
            href="/router"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Configure Router
          </Link>
        </div>

        {standardAgents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-zinc-400">Standard Agents</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {standardAgents.map(agent => (
                <Link
                  key={agent.label}
                  href={`/agents/${agent.label}`}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-6 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{agent.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-orange-400 transition-colors">
                        {agent.name}
                      </h3>
                      <div className="text-xs text-zinc-500 font-mono">{agent.label}</div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">
                    {agent.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {specializedAgents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-zinc-400">Specialized Agents</h2>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                PRO
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specializedAgents.map(agent => (
                <Link
                  key={agent.label}
                  href={`/agents/${agent.label}`}
                  className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 hover:border-orange-500/50 rounded-lg p-6 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{agent.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-orange-400 transition-colors">
                        {agent.name}
                      </h3>
                      <div className="text-xs text-zinc-500 font-mono">{agent.label}</div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">
                    {agent.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
