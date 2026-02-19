'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  label: string;
  name: string;
  emoji: string;
  description: string;
  hasMemory: boolean;
  memorySize: number;
}

interface AgentSession {
  label: string;
  sessionKey: string;
  status: 'active' | 'idle' | 'waiting';
  lastActive: string;
  messageCount: number;
  model: string;
}

// ─── Deterministic portrait from randomuser.me ────────────────────────────────

function labelToPortrait(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(31, h) + label.charCodeAt(i) | 0;
  const abs = Math.abs(h);
  const gender = abs % 2 === 0 ? 'men' : 'women';
  const idx = abs % 70;
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

function labelToThumb(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(31, h) + label.charCodeAt(i) | 0;
  const abs = Math.abs(h);
  const gender = abs % 2 === 0 ? 'men' : 'women';
  const idx = abs % 70;
  return `https://randomuser.me/api/portraits/thumb/${gender}/${idx}.jpg`;
}

// ─── Fake bio snippets keyed by role traits ───────────────────────────────────

function fakeBio(name: string, label: string, description: string): string {
  const bios = [
    `${name} specialises in ${description.toLowerCase().replace(/\.$/, '')}. Methodical, detail-oriented, and never ships without testing.`,
    `${name} is the kind of agent who reads the docs before asking questions. Strong bias for action, low tolerance for ambiguity.`,
    `With a background in ${label.replace(/-/g, ' ')}, ${name} brings structure to chaos and keeps the work moving.`,
    `${name} works best with clear objectives and tends to over-deliver. Known for catching edge cases nobody else noticed.`,
  ];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(31, h) + label.charCodeAt(i) | 0;
  return bios[Math.abs(h) % bios.length];
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, session }: { agent: Agent; session?: AgentSession }) {
  const [hovered, setHovered] = useState(false);
  const status = session?.status || 'idle';
  const portrait = labelToPortrait(agent.label);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/agents/${agent.label}`}
        className={`block bg-zinc-900 border rounded-xl p-5 transition-all ${
          status === 'active'
            ? 'border-orange-500/30 hover:border-orange-500/50'
            : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Portrait */}
          <div className="relative flex-shrink-0">
            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${
              status === 'active' ? 'border-orange-500/60' : 'border-zinc-700'
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portrait} alt={agent.name} className="w-full h-full object-cover" />
            </div>
            {/* Status dot */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
              status === 'active' ? 'bg-green-400' : 'bg-zinc-600'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm text-white group-hover:text-orange-400 transition-colors truncate">
                {agent.name}
              </h3>
              {status === 'active' && (
                <span className="flex-shrink-0 text-[10px] text-green-400 font-medium">Active</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-600 font-mono mb-2">{agent.label}</div>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        {session && (
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-3 text-[11px] text-zinc-600">
            <span>{session.messageCount} messages</span>
            <span className="text-zinc-700">·</span>
            <span className="font-mono truncate">{session.model?.split('/').pop()}</span>
            <span className="ml-auto text-zinc-700">{session.lastActive}</span>
          </div>
        )}
      </Link>

      {/* Hover info panel */}
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[60] w-72 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4 pointer-events-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-600 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={labelToThumb(agent.label)} alt={agent.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{agent.name}</div>
              <div className="text-[11px] text-zinc-500 font-mono">{agent.label}</div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {fakeBio(agent.name, agent.label, agent.description)}
          </p>
          <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-zinc-600'}`} />
            <span className="text-[11px] text-zinc-500 capitalize">{status}</span>
            {agent.hasMemory && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-600">{Math.round(agent.memorySize / 1024)}kb memory</span>
              </>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-700" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents/list')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-48 mb-6" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-zinc-800 rounded-xl" />)}
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No agents configured</h2>
            <p className="text-zinc-400 mb-6">
              Run <code className="px-2 py-1 bg-zinc-800 rounded text-orange-400">superclaw setup agents</code> to get started
            </p>
            <Link href="https://docs.openclaw.ai/superclaw/setup" target="_blank" className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors">
              View Setup Guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = sessions.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              {agents.length} configured
              {activeCount > 0 && <span className="text-green-400 ml-1.5">· {activeCount} active</span>}
            </p>
          </div>
          <Link href="/router" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            Configure Router
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.label}
              agent={agent}
              session={sessions.find(s => s.label === agent.label)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
