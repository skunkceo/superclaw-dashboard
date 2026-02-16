'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TokenStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime?: number;
  todayCost?: number;
  weekCost?: number;
  estimatedCost: number;
  byModel?: {
    today?: Record<string, { input: number; output: number; cost: number }>;
    thisWeek?: Record<string, { input: number; output: number; cost: number }>;
    thisMonth?: Record<string, { input: number; output: number; cost: number }>;
  };
}

interface RouterStatus {
  enabled: boolean;
  installed: boolean;
  version?: string;
}

export default function TokensPage() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [currentModel, setCurrentModel] = useState('');
  const [router, setRouter] = useState<RouterStatus>({ enabled: false, installed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, routerRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/router').catch(() => null),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStats(data.tokens);
        setCurrentModel(data.health?.defaultModel || 'unknown');
      }

      if (routerRes && routerRes.ok) {
        const routerData = await routerRes.json();
        setRouter(routerData);
      }
    } catch (err) {
      console.error('Failed to load token stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();
  const formatCost = (n: number) => `$${n.toFixed(4)}`;

  const formatModel = (raw: string): string => {
    if (!raw) return 'unknown';
    const modelMap: Record<string, string> = {
      'claude-opus-4-20250514': 'Opus 4',
      'claude-sonnet-4-20250514': 'Sonnet 3.7',
      'claude-sonnet-4-5-20250514': 'Sonnet 3.7',
      'claude-haiku-3-5-20241022': 'Haiku 3.5',
    };
    const bare = raw.replace('anthropic/', '');
    return modelMap[bare] || bare;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Tokens & Usage</h1>

        {/* Current Model */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Model</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                {formatModel(currentModel)}
              </div>
              <div className="text-sm text-zinc-500 mt-1 font-mono">{currentModel}</div>
            </div>
            <Link
              href="/models"
              className="px-4 py-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors"
            >
              Configure Models
            </Link>
          </div>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="text-zinc-400 text-sm mb-2">Today</div>
            <div className="text-3xl font-bold">{stats ? formatNumber(stats.today) : '0'}</div>
            <div className="text-sm text-zinc-500 mt-1">{stats?.todayCost ? formatCost(stats.todayCost) : '$0'}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="text-zinc-400 text-sm mb-2">This Week</div>
            <div className="text-3xl font-bold">{stats ? formatNumber(stats.thisWeek) : '0'}</div>
            <div className="text-sm text-zinc-500 mt-1">{stats?.weekCost ? formatCost(stats.weekCost) : '$0'}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="text-zinc-400 text-sm mb-2">This Month</div>
            <div className="text-3xl font-bold">{stats ? formatNumber(stats.thisMonth) : '0'}</div>
            <div className="text-sm text-zinc-500 mt-1">{stats ? formatCost(stats.estimatedCost) : '$0'}</div>
          </div>
        </div>

        {/* Model Router */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Smart Model Router</h2>
              <p className="text-sm text-zinc-400">
                Automatically selects the best model for each task based on complexity and cost.
                Uses Haiku for simple tasks (60x cheaper), Sonnet for balanced work, Opus for complex strategy.
              </p>
            </div>
            {router.installed ? (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                router.enabled 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-zinc-700 text-zinc-400'
              }`}>
                {router.enabled ? 'Enabled' : 'Disabled'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-400">
                Not Installed
              </span>
            )}
          </div>

          {!router.installed ? (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-sm text-zinc-300 mb-3">
                The model router is not installed. Install it from the SuperClaw dashboard to enable intelligent model selection.
              </p>
              <a
                href="https://superclaw.skunkglobal.com/models"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Install Router
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Router Version</span>
                  <span className="text-sm text-zinc-400 font-mono">{router.version || 'unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span className={`text-sm ${router.enabled ? 'text-green-400' : 'text-zinc-500'}`}>
                    {router.enabled ? 'Active - routing sub-agent tasks' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    <span className="text-xs font-medium text-green-400">Haiku</span>
                  </div>
                  <div className="text-xs text-zinc-500">Data pulls, simple tasks</div>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-xs font-medium text-blue-400">Sonnet</span>
                  </div>
                  <div className="text-xs text-zinc-500">Code, content, analysis</div>
                </div>
                <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-xs font-medium text-purple-400">Opus</span>
                  </div>
                  <div className="text-xs text-zinc-500">Strategy, architecture</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage by Model */}
        {stats?.byModel?.today && Object.keys(stats.byModel.today).length > 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Today's Usage by Model</h2>
            <div className="space-y-3">
              {Object.entries(stats.byModel.today).map(([model, usage]) => (
                <div key={model} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="font-medium">{formatModel(model)}</div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-zinc-400">
                      {formatNumber(usage.input + usage.output)} tokens
                    </span>
                    <span className="text-zinc-300">{formatCost(usage.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
