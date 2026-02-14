'use client';

import { useEffect, useState } from 'react';
import { HealthCard } from '@/components/HealthCard';
import { TokenUsage } from '@/components/TokenUsage';
import { SetupChecklist } from '@/components/SetupChecklist';
import { ActiveTasks } from '@/components/ActiveTasks';
import { SkillsPanel } from '@/components/SkillsPanel';
import { LobsterLogo } from '@/components/LobsterLogo';
import { Header } from '@/components/Header';

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
    completed: number;
    subAgents: Array<{
      id: string;
      task: string;
      model: string;
      status: string;
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
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Failed to fetch status');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
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
      <Header healthStatus={data.health.status} />

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
          <ActiveTasks tasks={data.tasks} />
        </div>

        {/* Bottom */}
        <SkillsPanel skills={data.skills} />
      </div>
    </main>
  );
}
