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

interface ModelInfo {
  provider: string;
  modelId: string;
  displayName: string;
  tier: string;
  available: boolean;
}

export default function ModelsPage() {
  const [prefs, setPrefs] = useState<ModelPrefs>({
    data_pulls: 'haiku',
    content: 'sonnet',
    code: 'sonnet',
    strategy: 'opus',
    research: 'sonnet',
    summaries: 'haiku',
  });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ installed: boolean; installedPath?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [changingDefault, setChangingDefault] = useState(false);
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [selectedNewDefault, setSelectedNewDefault] = useState('');

  useEffect(() => {
    fetchData();
    fetchSyncStatus();
  }, []);

  const fetchData = async () => {
    try {
      const [prefsRes, modelsRes] = await Promise.all([
        fetch('/api/model-prefs'),
        fetch('/api/models'),
      ]);
      
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data.prefs) {
          setPrefs(data.prefs);
        }
      }
      
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models || []);
        setDefaultModel(data.defaultModel || '');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/router/sync');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  const syncToWorkspace = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/router/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: '/root/clawd' }),
      });
      if (res.ok) {
        await fetchSyncStatus();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncing(false);
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
        // Auto-sync to workspace if installed
        if (syncStatus?.installed) {
          await syncToWorkspace();
        }
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premium': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Balanced': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Fast': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-zinc-700 text-zinc-400 border-zinc-600';
    }
  };

  const changeDefaultModel = async (modelId: string) => {
    setChangingDefault(true);
    try {
      const res = await fetch('/api/default-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });
      if (res.ok) {
        setDefaultModel(modelId);
        setShowDefaultModal(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        console.error('Failed to change default model');
      }
    } catch (err) {
      console.error('Failed to change default model:', err);
    } finally {
      setChangingDefault(false);
    }
  };

  const openDefaultModal = () => {
    setSelectedNewDefault(defaultModel);
    setShowDefaultModal(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Models</h1>
        <p className="text-zinc-400 mb-6 sm:mb-8 text-base sm:text-sm">Available models and task routing preferences</p>

        {/* Available Models */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : models.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Available Models
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {models.map((model) => (
                <div
                  key={model.modelId}
                  className={`p-4 rounded-lg border ${
                    model.modelId === defaultModel
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-zinc-800 bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{model.displayName}</div>
                      <div className="text-zinc-500 text-xs sm:text-sm font-mono truncate">{model.provider}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ${getTierColor(model.tier)}`}>
                      {model.tier}
                    </span>
                  </div>
                  {model.modelId === defaultModel && (
                    <span className="text-xs text-orange-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Default model
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Router Installation Status - only show if NOT installed */}
        {syncStatus && !syncStatus.installed && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Router Installation
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-yellow-400 font-medium mb-1">Router Not Installed</div>
                    <div className="text-zinc-400 text-sm mb-2">
                      Install the model router to your OpenClaw workspace to enable automatic model selection.
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={syncToWorkspace}
                disabled={syncing}
                className="w-full px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Installing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install to Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Task Routing Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-1">Task Routing</h2>
          <p className="text-zinc-500 text-sm">Configure which model to use for different task types</p>
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Active:</strong> Task routing is now enabled! When spawning sub-agents, the system automatically selects the appropriate model based on task type and these preferences.</span>
            </p>
          </div>
        </div>

        {/* Page Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mb-6">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2.5 sm:px-3 sm:py-1.5 text-zinc-400 hover:text-white text-sm font-medium"
          >
            Reset to Defaults
          </button>
          <button
            onClick={openDefaultModal}
            disabled={models.length === 0}
            className="px-4 py-2.5 sm:px-3 sm:py-1.5 text-blue-400 hover:text-blue-300 disabled:text-zinc-500 text-sm font-medium"
          >
            Change Default Model
          </button>
          <button
            onClick={savePrefs}
            disabled={saving}
            className="px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-white font-medium mb-4">Model Key</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODELS.map((model) => (
              <div key={model.id} className="flex items-center gap-3">
                <span className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                  model.color === 'green' ? 'bg-green-500' :
                  model.color === 'blue' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`} />
                <div>
                  <div className="text-white font-medium text-base sm:text-sm">{model.name}</div>
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
          <div className="space-y-4">
            {TASK_CATEGORIES.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                      prefs[task.id] === 'opus' ? 'bg-purple-500/10 text-purple-400' :
                      prefs[task.id] === 'sonnet' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {task.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-medium text-base sm:text-sm">{task.name}</h3>
                        {prefs[task.id] === task.recommended && (
                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-sm sm:text-sm">{task.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleChange(task.id, model.id)}
                        className={`px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                          prefs[task.id] === model.id
                            ? model.color === 'green'
                              ? 'bg-green-500 text-white'
                              : model.color === 'blue'
                                ? 'bg-blue-500 text-white'
                                : 'bg-purple-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white active:bg-zinc-700'
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
        <div className="mt-8 bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cost Guidance
          </h3>
          <div className="space-y-3 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start gap-1">
              <span className="text-green-400 font-medium text-sm">Haiku:</span>
              <span className="text-zinc-400 text-sm">~$0.25 per 1M tokens — Use for simple data extraction, summaries, boilerplate</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1">
              <span className="text-blue-400 font-medium text-sm">Sonnet:</span>
              <span className="text-zinc-400 text-sm">~$3 per 1M tokens — Good balance for content, code, and most tasks</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1">
              <span className="text-purple-400 font-medium text-sm">Opus:</span>
              <span className="text-zinc-400 text-sm">~$15 per 1M tokens — Reserve for complex strategy and architecture</span>
            </div>
          </div>
        </div>

        {/* Change Default Model Modal */}
        {showDefaultModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-semibold text-white mb-4">Change Default Model</h2>
              <p className="text-zinc-400 text-sm mb-6">Select a new default model for the OpenClaw gateway:</p>
              
              <div className="space-y-3 mb-6">
                {models.map((model) => (
                  <label key={model.modelId} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="defaultModel"
                      value={model.modelId}
                      checked={selectedNewDefault === model.modelId}
                      onChange={(e) => setSelectedNewDefault(e.target.value)}
                      className="w-4 h-4 text-red-600 bg-zinc-800 border-zinc-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{model.displayName}</div>
                      <div className="text-zinc-500 text-xs">{model.provider}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getTierColor(model.tier)}`}>
                      {model.tier}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDefaultModal(false)}
                  className="flex-1 px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => changeDefaultModel(selectedNewDefault)}
                  disabled={!selectedNewDefault || selectedNewDefault === defaultModel || changingDefault}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  {changingDefault ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Changing...
                    </>
                  ) : (
                    'Change Default'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
