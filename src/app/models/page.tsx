'use client';

import { useEffect, useState } from 'react';

interface ModelPrefs {
  data_pulls: string;
  content: string;
  code: string;
  strategy: string;
  research: string;
  summaries: string;
  [key: string]: string;
}

const TASK_CATEGORIES = [
  {
    id: 'data_pulls',
    name: 'Data Pulls',
    description: 'GSC/GA4 data extraction, sitemap checks, API calls',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    recommended: 'haiku',
  },
  {
    id: 'content',
    name: 'Content Writing',
    description: 'Blog posts, documentation, copy, marketing materials',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    recommended: 'sonnet',
  },
  {
    id: 'code',
    name: 'Code Generation',
    description: 'Writing code, debugging, refactoring, PRs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    recommended: 'sonnet',
  },
  {
    id: 'strategy',
    name: 'Strategy & Architecture',
    description: 'Business planning, technical architecture, complex decisions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    recommended: 'opus',
  },
  {
    id: 'research',
    name: 'Research & Analysis',
    description: 'Competitor analysis, market research, SEO audits',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    recommended: 'sonnet',
  },
  {
    id: 'summaries',
    name: 'Daily Summaries',
    description: 'Morning briefs, status updates, report generation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    recommended: 'haiku',
  },
];

const MODELS = [
  { id: 'haiku', name: 'Haiku', description: 'Fast & cheap', color: 'green' },
  { id: 'sonnet', name: 'Sonnet', description: 'Balanced', color: 'blue' },
  { id: 'opus', name: 'Opus', description: 'Best quality', color: 'purple' },
];

export default function ModelsPage() {
  const [prefs, setPrefs] = useState<ModelPrefs>({
    data_pulls: 'haiku',
    content: 'sonnet',
    code: 'sonnet',
    strategy: 'opus',
    research: 'sonnet',
    summaries: 'haiku',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const res = await fetch('/api/model-prefs');
      if (res.ok) {
        const data = await res.json();
        if (data.prefs) {
          setPrefs(data.prefs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch model preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/model-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (taskId: string, model: string) => {
    setPrefs((prev) => ({ ...prev, [taskId]: model }));
  };

  const resetToDefaults = () => {
    setPrefs({
      data_pulls: 'haiku',
      content: 'sonnet',
      code: 'sonnet',
      strategy: 'opus',
      research: 'sonnet',
      summaries: 'haiku',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Actions */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm"
          >
            Reset to Defaults
          </button>
          <button
            onClick={savePrefs}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
        {/* Model Legend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-white font-medium mb-3">Available Models</h2>
          <div className="grid grid-cols-3 gap-4">
            {MODELS.map((model) => (
              <div key={model.id} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  model.color === 'green' ? 'bg-green-500' :
                  model.color === 'blue' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`} />
                <div>
                  <div className="text-white font-medium">{model.name}</div>
                  <div className="text-zinc-500 text-sm">{model.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Categories */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : (
          <div className="space-y-3">
            {TASK_CATEGORIES.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    prefs[task.id] === 'opus' ? 'bg-purple-500/10 text-purple-400' :
                    prefs[task.id] === 'sonnet' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-green-500/10 text-green-400'
                  }`}>
                    {task.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{task.name}</h3>
                      {prefs[task.id] === task.recommended && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-sm mt-0.5">{task.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleChange(task.id, model.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          prefs[task.id] === model.id
                            ? model.color === 'green'
                              ? 'bg-green-500 text-white'
                              : model.color === 'blue'
                                ? 'bg-blue-500 text-white'
                                : 'bg-purple-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost Guidance */}
        <div className="mt-8 bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cost Guidance
          </h3>
          <div className="text-zinc-400 text-sm space-y-1">
            <p>
              <span className="text-green-400 font-medium">Haiku:</span> ~$0.25 per 1M tokens — Use for simple data extraction, summaries, boilerplate
            </p>
            <p>
              <span className="text-blue-400 font-medium">Sonnet:</span> ~$3 per 1M tokens — Good balance for content, code, and most tasks
            </p>
            <p>
              <span className="text-purple-400 font-medium">Opus:</span> ~$15 per 1M tokens — Reserve for complex strategy and architecture
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
