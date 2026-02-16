'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ModelInfo {
  provider: string;
  modelId: string;
  displayName: string;
  tier: string;
  available: boolean;
}

interface LicenseStatus {
  active: boolean;
  tier: 'free' | 'pro';
  features: string[];
}

const MODEL_OPTIONS = [
  {
    id: 'claude-haiku-3-5-20241022',
    name: 'Haiku 3.5',
    fullVersion: 'Claude 3.5 Haiku (Oct 2024)',
    tier: 'Fast',
    description: 'Quick responses, lowest cost (60x cheaper than Opus)',
    useCases: 'Light chats, simple questions, data pulls',
    color: 'green',
    icon: '⚡',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Sonnet 4',
    fullVersion: 'Claude Sonnet 4 (May 2025)',
    tier: 'Balanced',
    description: 'Best balance of speed, quality, and cost',
    useCases: 'General work, coding, content, most tasks',
    color: 'blue',
    icon: '⚖️',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Opus 4.6',
    fullVersion: 'Claude Opus 4.6 (May 2025)',
    tier: 'Powerful',
    description: 'Maximum intelligence for complex problems',
    useCases: 'Strategy, architecture, difficult debugging',
    color: 'purple',
    icon: '🧠',
  },
];

export default function ModelsPage() {
  const [defaultModel, setDefaultModel] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsRes, licenseRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/license/status'),
      ]);
      
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models || []);
        setDefaultModel(data.defaultModel || '');
      }
      
      if (licenseRes.ok) {
        const data = await licenseRes.json();
        setLicense(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDefaultModel = async (newModelId: string) => {
    if (changing) return;
    
    if (!confirm(`Switch default model to ${MODEL_OPTIONS.find(m => m.id === newModelId)?.name}?\n\nThis will affect all new chats and tasks.`)) {
      return;
    }

    setChanging(true);
    try {
      const res = await fetch('/api/models/change-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: newModelId }),
      });

      if (res.ok) {
        setDefaultModel(newModelId);
        alert('Default model updated! The gateway will restart in a moment.');
      } else {
        const data = await res.json();
        alert(`Failed to change model: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Failed to change default model');
    } finally {
      setChanging(false);
    }
  };

  const formatModelId = (raw: string): string => {
    const modelMap: Record<string, string> = {
      'claude-opus-4-20250514': 'Opus 4.6',
      'claude-sonnet-4-20250514': 'Sonnet 4',
      'claude-sonnet-4-5-20250514': 'Sonnet 4',
      'claude-haiku-3-5-20241022': 'Haiku 3.5',
    };
    return modelMap[raw.replace('anthropic/', '')] || raw;
  };

  const isPro = license?.active && license.tier === 'pro';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const currentModelInfo = MODEL_OPTIONS.find(m => defaultModel.includes(m.id.split('-')[1]));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Model Configuration</h1>
            <p className="text-zinc-400">Choose which AI models power your agent</p>
          </div>
          {!isPro && (
            <Link
              href="/settings"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>

        {/* Current Default Model */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Default Model</h2>
              <p className="text-sm text-zinc-400">
                This model powers your main agent for all direct conversations and tasks.
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">
                  {currentModelInfo?.icon} {formatModelId(defaultModel)}
                </div>
                <div className="text-xs text-zinc-500 font-mono mb-1">{currentModelInfo?.fullVersion}</div>
                <div className="text-sm text-zinc-300">{currentModelInfo?.description}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentModelInfo?.color === 'green' ? 'bg-green-500/20 text-green-400' :
                currentModelInfo?.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {currentModelInfo?.tier}
              </span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-blue-400 font-medium mb-1">When to switch models:</p>
                <ul className="text-blue-400/80 space-y-1 text-xs">
                  <li><strong>Haiku 3.5</strong> — Light chats, quick questions, casual conversation (saves tokens)</li>
                  <li><strong>Sonnet 4</strong> — Balanced for most work (coding, content, research)</li>
                  <li><strong>Opus 4.6</strong> — Complex problems, strategy, architecture, difficult debugging</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Model Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MODEL_OPTIONS.map((model) => {
              const isActive = defaultModel.includes(model.id);
              return (
                <button
                  key={model.id}
                  onClick={() => !isActive && changeDefaultModel(model.id)}
                  disabled={isActive || changing}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isActive
                      ? 'border-orange-500 bg-orange-500/10 cursor-default'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                  } ${changing ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{model.icon}</span>
                      <div>
                        <div className="font-semibold">{model.name}</div>
                        <div className="text-xs text-zinc-500">{model.fullVersion}</div>
                      </div>
                    </div>
                    {isActive && (
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mb-2">{model.description}</div>
                  <div className="text-xs text-zinc-500">{model.useCases}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Smart Router Section - PRO ONLY */}
        <div className={`bg-zinc-900 rounded-xl border p-6 relative ${isPro ? 'border-zinc-800' : 'border-orange-500/50'}`}>
          {!isPro && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Pro Feature</h3>
                <p className="text-zinc-400 mb-4">
                  Smart Model Router is available in SuperClaw Pro
                </p>
                <Link
                  href="/settings"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg transition-colors font-medium"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          )}

          <div className={isPro ? '' : 'pointer-events-none'}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                  Smart Model Router
                  {isPro && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-full">PRO</span>
                  )}
                </h2>
                <p className="text-sm text-zinc-400">
                  Automatically selects the best model for sub-agent tasks based on complexity.
                </p>
              </div>
              {isPro && (
                <Link
                  href="/stats"
                  className="px-3 py-1 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors text-sm"
                >
                  View Stats →
                </Link>
              )}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="text-sm">
                  <p className="text-yellow-400 font-medium mb-1">Intelligent Cost Optimization</p>
                  <p className="text-yellow-400/80 text-xs">
                    Analyzes task titles and automatically picks Haiku for simple tasks (data pulls),
                    Sonnet for balanced work (code, content), and Opus for complex strategy. Saves up to 60x on costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="font-medium text-green-400">Haiku 3.5</span>
                </div>
                <div className="text-xs text-zinc-400">Data pulls, sitemaps, simple API calls</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="font-medium text-blue-400">Sonnet 4</span>
                </div>
                <div className="text-xs text-zinc-400">Code, content, analysis, research</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="font-medium text-purple-400">Opus 4.6</span>
                </div>
                <div className="text-xs text-zinc-400">Strategy, architecture, complex decisions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Models Info */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mt-6">
          <h3 className="font-semibold mb-3">Available Models</h3>
          <div className="space-y-2">
            {models.map((model) => (
              <div key={model.modelId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{model.displayName}</span>
                  <span className="text-zinc-500 ml-2">({model.provider})</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  model.available ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {model.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
