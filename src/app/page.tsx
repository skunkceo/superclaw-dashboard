'use client';

import { useEffect, useState } from 'react';
import { HealthCard } from '@/components/HealthCard';
import { TokenUsage } from '@/components/TokenUsage';
import { SetupChecklist } from '@/components/SetupChecklist';
import { TasksDashboard } from '@/components/TasksDashboard';
import { SkillsPanel } from '@/components/SkillsPanel';
import { LobsterLogo } from '@/components/LobsterLogo';

interface ModelUsage {
  input: number;
  output: number;
  cost: number;
}

interface DashboardData {
  health: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: string;
    lastHeartbeat: string;
    gatewayVersion: string;
  };
  tokens: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime?: number;
    estimatedCost: number;
    todayCost?: number;
    weekCost?: number;
    byModel?: {
      today?: Record<string, ModelUsage>;
      thisWeek?: Record<string, ModelUsage>;
      thisMonth?: Record<string, ModelUsage>;
    };
  };
  subscription?: {
    provider: string;
    plan: string;
    isSubscription?: boolean;
  } | null;
  setup: {
    memory: boolean;
    channels: string[];
    skills: string[];
    apiKeys: string[];
  };
  tasks: {
    active: number;
    pending: number;
    completed: number;
    allTasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'active' | 'completed';
      assigned_agent: string | null;
      what_doing: string | null;
      created_at: number;
      completed_at: number | null;
      session_id: string | null;
      source: 'chat' | 'backlog' | 'cron';
      priority?: string;
      area?: string;
    }>;
    mainSession?: {
      status: 'active' | 'idle' | 'done';
      lastActive: string;
      recentMessages?: number;
      currentTask?: string | null;
      model?: string;
      totalTokens?: number;
    };
    // Keep legacy fields for backward compatibility
    subAgents?: Array<{
      id: string;
      task: string;
      model: string;
      status: string;
      lastActive?: string;
      messages?: Array<{
        role: string;
        content: string;
        timestamp: string;
      }>;
    }>;
    allSessions?: Array<{
      key: string;
      sessionId?: string;
      displayName: string;
      status: 'active' | 'idle' | 'done';
      lastActive: string;
      model: string;
      totalTokens: number;
      messages: Array<{
        role: string;
        content: string;
        timestamp: string;
      }>;
    }>;
    activityFeed?: Array<{
      type: string;
      sessionKey: string;
      sessionName: string;
      role: string;
      content: string;
      timestamp: string;
      model: string;
    }>;
  };
  skills: Array<{
    name: string;
    enabled: boolean;
    description: string;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, tasksRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/dashboard-tasks'),
        ]);
        
        if (!statusRes.ok) throw new Error('Failed to fetch status');
        
        const statusData = await statusRes.json();
        
        // Merge in dashboard tasks if available
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          statusData.tasks = { ...statusData.tasks, ...tasksData.tasks };
        }
        
        setData(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds for real-time updates
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LobsterLogo className="w-16 h-16 animate-pulse" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <HealthCard health={data.health} />
          <TokenUsage tokens={data.tokens} subscription={data.subscription} />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <SetupChecklist setup={data.setup} />
          <TasksDashboard tasks={data.tasks} />
        </div>

        {/* Bottom */}
        <SkillsPanel skills={data.skills} />
      </div>
    </main>
  );
}
