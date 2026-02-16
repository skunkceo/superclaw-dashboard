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
  const [showRouterHelp, setShowRouterHelp] = useState(false);

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
        <h1 className="text-3xl font-bold mb-6">Stats & Usage</h1>

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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">Smart Model Router</h2>
                <button
                  onClick={() => setShowRouterHelp(true)}
                  className="text-zinc-400 hover:text-orange-400 transition-colors"
                  title="Learn more"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-zinc-400">
                Automatically selects the best model for each task based on complexity and cost.
                Uses Haiku for simple tasks (60x cheaper), Sonnet for balanced work, Opus for complex strategy.
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              {router.installed ? (
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  router.enabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {router.enabled ? 'Enabled' : 'Disabled'}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-400 whitespace-nowrap">
                  Not Installed
                </span>
              )}
            </div>
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

        {/* Router Help Modal */}
        {showRouterHelp && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowRouterHelp(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-2xl w-full p-6 shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Smart Model Router</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                        Experimental
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRouterHelp(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 text-sm text-zinc-300">
                  <p>
                    The Smart Model Router automatically chooses the best AI model for each sub-agent task based on complexity and cost optimization.
                  </p>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-2">How it works:</h4>
                    <ul className="space-y-2 text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span><strong className="text-green-400">Haiku</strong> — Simple tasks (data pulls, basic scripts) — 60x cheaper than Opus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span><strong className="text-blue-400">Sonnet</strong> — Balanced work (coding, content, analysis) — good quality/cost ratio</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span><strong className="text-purple-400">Opus</strong> — Complex strategy (architecture, deep reasoning) — most capable</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-700/30">
                    <h4 className="font-semibold text-orange-400 mb-2">Trade-offs to consider:</h4>
                    <ul className="space-y-2 text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">⚠</span>
                        <span><strong>Routing mistakes:</strong> May send complex tasks to Haiku, requiring re-runs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">⚠</span>
                        <span><strong>Quality variance:</strong> Same task type may get different models on different runs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">⚠</span>
                        <span><strong>No manual override:</strong> Currently can't force a specific model per task</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <h4 className="font-semibold text-white mb-2">Best for:</h4>
                    <p className="text-zinc-400">
                      Autonomous overnight work where cost optimization matters and you trust the system to retry if needed.
                      Main session (Clawd) always uses your selected model — only sub-agent spawns are routed.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <a
                    href="https://superclaw.skunkglobal.com/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    Configure routing rules
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setShowRouterHelp(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
