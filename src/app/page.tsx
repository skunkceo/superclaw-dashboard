'use client';

import { useEffect, useState } from 'react';
import { TokenUsage } from '@/components/TokenUsage';
import { LobsterLogo } from '@/components/LobsterLogo';
import { ProactivityBanner } from '@/components/ProactivityBanner';
import Link from 'next/link';

interface ModelUsage { input: number; output: number; cost: number; }

interface DashboardData {
  health: { status: 'healthy'|'degraded'|'offline'; uptime: string; lastHeartbeat: string; gatewayVersion: string; defaultModel?: string; };
  tokens: { today: number; thisWeek: number; thisMonth: number; allTime?: number; estimatedCost: number; todayCost?: number; weekCost?: number; byModel?: { today?: Record<string,ModelUsage>; thisWeek?: Record<string,ModelUsage>; thisMonth?: Record<string,ModelUsage>; }; };
  subscription?: { provider: string; plan: string; isSubscription?: boolean; } | null;
  setup: { memory: boolean; channels: string[]; skills: string[]; apiKeys: string[]; };
  tasks: { active: number; pending: number; completed: number; allTasks: Array<{ id:string; title:string; status:'pending'|'active'|'completed'; assigned_agent:string|null; what_doing:string|null; created_at:number; completed_at:number|null; session_id:string|null; source:'chat'|'backlog'|'cron'; priority?:string; area?:string; }>; mainSession?: { status:'active'|'idle'|'done'; lastActive:string; recentMessages?:number; currentTask?:string|null; channel?:string; model?:string; totalTokens?:number; queuedMessages?:number; }; allSessions?: Array<{ key:string; sessionId?:string; displayName:string; status:'active'|'idle'|'done'; lastActive:string; model:string; totalTokens:number; messages:Array<{role:string;content:string;timestamp:string}>; }>; activityFeed?: Array<{ type:string; sessionKey:string; sessionName:string; role:string; content:string; timestamp:string; model:string; }>; };
  skills: Array<{ name: string; enabled: boolean; description: string }>;
}

interface AgentData {
  workspaces: Array<{ label:string; name:string; emoji:string; workspacePath:string; hasMemory:boolean; memorySize:number; }>;
  sessions: Array<{ label:string; sessionKey:string; status:'active'|'idle'|'waiting'; lastActive:string; messageCount:number; model:string; }>;
}

interface ActivityEntry { id:string; timestamp:number; agent_label:string; action_type:string; summary:string; details?:string; links?:string; }

function labelToPortrait(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(31, h) + label.charCodeAt(i) | 0;
  const abs = Math.abs(h);
  const gender = abs % 2 === 0 ? 'men' : 'women';
  const idx = abs % 70; // randomuser has 0-99 but 70 is safe range
  return `https://randomuser.me/api/portraits/thumb/${gender}/${idx}.jpg`;
}

function AgentAvatarRow({ agentData }: { agentData: AgentData | null }) {
  const agents = agentData?.workspaces.map(w => { const s = agentData.sessions.find(s => s.label === w.label); return { ...w, status: s?.status || 'idle' }; }) || [];
  const activeCount = agents.filter(a => a.status === 'active').length;
  if (agents.length === 0) return null;
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-[11px] text-zinc-500 font-medium">Agents:</span>
      <div className="flex items-center gap-1.5">
        {agents.map(agent => (
          <Link key={agent.label} href="/agents" title={agent.name} className="relative group">
            <div className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 ${agent.status==='active'?'border-orange-500/70 hover:border-orange-500':'border-zinc-700 hover:border-zinc-600'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={labelToPortrait(agent.label)} alt={agent.name} className="w-full h-full object-cover" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-zinc-950 ${agent.status==='active'?'bg-green-400':'bg-zinc-700'}`} />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-zinc-800 text-zinc-200 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">{agent.name}</span>
          </Link>
        ))}
      </div>
      <span className="text-[11px] ml-1">{activeCount>0?<span className="text-green-400">{activeCount} active</span>:<span className="text-zinc-600">all idle</span>}<span className="text-zinc-700"> · {agents.length}</span></span>
      <Link href="/agents" className="text-[11px] text-zinc-600 hover:text-orange-400 transition-colors">Manage →</Link>
    </div>
  );
}

const ACTION_ICONS: Record<string,string> = { started:'▶',completed:'✓',commit:'⊕',pr_opened:'⤴',deploy:'↑',error:'✕',blocked:'⊘',research:'◎',analysis:'◈',report:'▤',content:'✎',writing:'✎',monitoring:'◷',intel:'◉',site_check:'◉',info:'◦' };
const ACTION_COLORS: Record<string,string> = { completed:'text-green-400',commit:'text-blue-400',pr_opened:'text-purple-400',deploy:'text-orange-400',error:'text-red-400',blocked:'text-red-400',started:'text-orange-300',research:'text-zinc-400',analysis:'text-zinc-400' };

function timeAgo(ts: number): string {
  if (!ts||isNaN(ts)) return '—';
  const diff = Date.now()-ts; if (diff<0) return 'just now';
  const mins = Math.floor(diff/60000); if (mins<1) return 'just now'; if (mins<60) return `${mins}m ago`;
  const hours = Math.floor(mins/60); if (hours<24) return `${hours}h ago`;
  return `${Math.floor(hours/24)}d ago`;
}

function WorkLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => { try { const res = await fetch('/api/activity?limit=10'); if (res.ok) { const d = await res.json(); setEntries(d.entries||[]); } } finally { setLoading(false); } };
    load(); const i = setInterval(load,30000); return () => clearInterval(i);
  }, []);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-white">Work Log</h3><Link href="/activity" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">View all →</Link></div>
      {loading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-7 bg-zinc-800/60 rounded animate-pulse"/>)}</div>
        : entries.length===0 ? <div className="flex-1 flex items-center justify-center"><span className="text-xs text-zinc-600">No activity logged yet</span></div>
        : <div className="space-y-0 flex-1 min-h-0 overflow-y-auto">{entries.map(entry => {
          const icon=ACTION_ICONS[entry.action_type]||'◦'; const color=ACTION_COLORS[entry.action_type]||'text-zinc-500';
          let links: Array<{label:string;url:string}> = []; try { links=JSON.parse(entry.links||'[]'); } catch {}
          return (<div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-zinc-800/50 last:border-0">
            <span className={`mt-0.5 w-3.5 flex-shrink-0 text-center text-[11px] font-mono ${color}`}>{icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-300 leading-snug line-clamp-1">{entry.summary}</span>
              {links.length>0 && <div className="flex gap-2 mt-0.5">{links.slice(0,2).map((l,i)=><a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors" onClick={e=>e.stopPropagation()}>{l.label}</a>)}</div>}
            </div>
            <span className="flex-shrink-0 text-[10px] text-zinc-700 mt-0.5 font-mono whitespace-nowrap">{timeAgo(entry.timestamp)}</span>
          </div>);
        })}</div>}
    </div>
  );
}

function CompactSkills({ skills }: { skills: Array<{name:string;enabled:boolean;description:string}> }) {
  const enabledCount = skills.filter(s=>s.enabled).length;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Skills</h3>
        <div className="flex items-center gap-3"><span className="text-xs text-zinc-600">{enabledCount}/{skills.length} enabled</span><Link href="/skills" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Browse →</Link></div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        {skills.map(skill=>(
          <div key={skill.name} title={skill.description} className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 ${skill.enabled?'bg-orange-500/5 border-orange-500/20 text-zinc-300':'bg-zinc-800/40 border-zinc-800 text-zinc-600'}`}>
            <span className="truncate font-medium">{skill.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${skill.enabled?'bg-orange-400':'bg-zinc-700'}`}/>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-800"><Link href="/skills" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Manage capabilities →</Link></div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData|null>(null);
  const [agentData, setAgentData] = useState<AgentData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes,aRes] = await Promise.all([fetch('/api/status'),fetch('/api/agents/list')]);
        if (!sRes.ok) throw new Error('Failed to fetch status');
        setData(await sRes.json());
        if (aRes.ok) setAgentData(await aRes.json());
      } catch (err) { setError(err instanceof Error?err.message:'Unknown error'); }
      finally { setLoading(false); }
    };
    fetchData(); const interval=setInterval(fetchData,10000); return ()=>clearInterval(interval);
  }, []);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><LobsterLogo className="w-16 h-16 animate-pulse"/><div className="text-white text-xl">Loading...</div></div></div>;
  if (error||!data) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-red-400 text-xl">{error||'No data'}</div></div>;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">

        <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full flex-shrink-0 ${data.health.status==='healthy'?'bg-green-400':data.health.status==='degraded'?'bg-yellow-400':'bg-red-400'}`}/><span className="text-sm text-zinc-300 font-medium capitalize">{data.health.status}</span></div>
          <div className="w-px h-4 bg-zinc-700 hidden sm:block"/>
          <span className="text-xs text-zinc-500 font-mono">{data.health.defaultModel||'claude-sonnet'}</span>
          <div className="w-px h-4 bg-zinc-700 hidden sm:block"/>
          <span className="text-xs text-zinc-500">Up {data.health.uptime}</span>
          {data.subscription&&<><div className="w-px h-4 bg-zinc-700 hidden sm:block"/><span className="text-xs text-zinc-600 capitalize">{data.subscription.plan}</span></>}
          <div className="ml-auto"><Link href="/launchpad" className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Launchpad</Link></div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(['SOUL.md','MEMORY.md','TOOLS.md','HEARTBEAT.md'] as const).map(file=>(
              <Link key={file} href={file==='MEMORY.md'?'/memory':`/workspace?file=${file}`} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors font-mono">{file}</Link>
            ))}
            <Link href="/workspace" className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">All files →</Link>
          </div>
          <AgentAvatarRow agentData={agentData}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ProactivityBanner />
          <TokenUsage tokens={data.tokens} subscription={data.subscription}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <WorkLog/>
          <CompactSkills skills={data.skills}/>
        </div>

      </div>
    </main>
  );
}
