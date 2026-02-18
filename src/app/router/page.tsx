'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    channels?: string[];
    keywords?: string[];
    sender?: string;
    hasThread?: boolean;
  };
  action: {
    agent: string;
    model: string;
    spawnNew?: boolean;
  };
  priority: number;
}

export default function RouterPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState('');
  const [testChannel, setTestChannel] = useState('#dev');
  const [testResult, setTestResult] = useState<RoutingRule | null>(null);
  const [testPerformed, setTestPerformed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch('/api/router/rules');
        if (!res.ok) throw new Error('Failed to fetch rules');
        const data = await res.json();
        setRules(data.rules || []);
      } catch (error) {
        console.error('Error fetching rules:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const saveRules = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/router/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: '1.0', rules, fallback: { agent: 'main', notify: true } })
      });
      if (!res.ok) throw new Error('Failed to save rules');
    } catch (error) {
      console.error('Error saving rules:', error);
      alert('Failed to save routing rules');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    setTestPerformed(true);
    
    // Match rules based on priority order
    const matched = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority) // Lower priority number = higher priority
      .find(rule => {
        // Check channel match (with or without #)
        const channelMatch = !rule.conditions.channels || rule.conditions.channels.length === 0 ||
          rule.conditions.channels.some(ch => {
            const normalizedRuleCh = ch.startsWith('#') ? ch : `#${ch}`;
            const normalizedTestCh = testChannel.startsWith('#') ? testChannel : `#${testChannel}`;
            return normalizedRuleCh.toLowerCase() === normalizedTestCh.toLowerCase();
          });
        
        // Check keyword match (case-insensitive, partial match)
        const keywordMatch = !rule.conditions.keywords || rule.conditions.keywords.length === 0 ||
          rule.conditions.keywords.some(kw => 
            testMessage.toLowerCase().includes(kw.toLowerCase())
          );
        
        // Both conditions must match (AND logic)
        return channelMatch && keywordMatch;
      });
    
    setTestResult(matched || null);
  };

  const toggleRule = async (id: string) => {
    const newRules = rules.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setRules(newRules);
    
    // Auto-save after toggle
    setSaving(true);
    try {
      await fetch('/api/router/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: '1.0', rules: newRules, fallback: { agent: 'main', notify: true } })
      });
    } catch (error) {
      console.error('Error saving rules:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading routing rules...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold">Message Router</h1>
          </div>
          <p className="text-zinc-400">
            Configure how messages are automatically routed to specialized agents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routing Rules */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold">Routing Rules</h2>
                <button 
                  onClick={() => setShowAddRule(true)}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm text-white transition"
                >
                  + Add Rule
                </button>
              </div>

              <div className="divide-y divide-zinc-800">
                {rules.map((rule) => (
                  <div key={rule.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`relative w-11 h-6 rounded-full transition ${
                          rule.enabled ? 'bg-orange-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>

                      {/* Rule Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-white">{rule.name}</h3>
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded">
                            Priority {rule.priority}
                          </span>
                        </div>

                        {/* Conditions */}
                        <div className="mb-3">
                          <div className="text-xs text-zinc-500 mb-1">When:</div>
                          <div className="flex flex-wrap gap-2">
                            {rule.conditions.channels?.map(ch => (
                              <span key={ch} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                {ch}
                              </span>
                            ))}
                            {rule.conditions.keywords?.map(kw => (
                              <span key={kw} className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                                {kw}
                              </span>
                            ))}
                            {rule.conditions.sender && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                from: {rule.conditions.sender}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-zinc-500">Then:</div>
                          <div className="flex items-center gap-2">
                            <span className="text-orange-400">→ {rule.action.agent}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded font-mono">
                              {rule.action.model.replace('claude-', '')}
                            </span>
                            {rule.action.spawnNew && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                spawn new
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit */}
                      <button 
                        onClick={() => setEditingRule(rule)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Test Panel */}
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="font-semibold">Test Router</h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Channel</label>
                  <select
                    value={testChannel}
                    onChange={(e) => setTestChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option>#dev</option>
                    <option>#marketing</option>
                    <option>#support</option>
                    <option>#product</option>
                    <option>DM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Message</label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter a test message..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handleTest}
                  className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-medium transition"
                >
                  Test Route
                </button>

                {testResult && (
                  <div className="p-4 bg-zinc-800 rounded-lg border border-orange-500/30">
                    <div className="text-xs text-zinc-500 mb-1">Would route to:</div>
                    <div className="font-medium text-orange-400 mb-2">{testResult.action.agent}</div>
                    <div className="text-xs text-zinc-400">
                      Using {testResult.action.model} • Priority {testResult.priority}
                    </div>
                  </div>
                )}

                {testPerformed && !testResult && (
                  <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="text-sm text-zinc-400">No matching rule - would go to main session</div>
                  </div>
                )}
              </div>
            </div>

            {/* How Routing Works */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="font-semibold">How Routing Works</h2>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm text-zinc-400">
                <p className="font-medium text-white">Messages are routed by:</p>
                <div className="pl-3 space-y-2 text-xs">
                  <div><span className="text-orange-400">1. Channel</span> - Which Slack/Discord channel it's from</div>
                  <div><span className="text-orange-400">2. Keywords</span> - Natural language ("fix", "bug", "design")</div>
                  <div><span className="text-orange-400">3. Priority</span> - Rules checked in order (1 = first)</div>
                </div>
                <p className="pt-2 text-xs border-t border-zinc-800 mt-3 pt-3">
                  <span className="text-white">Repo Assignment:</span> Configure in agent workspaces via <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-orange-400">agent-repo-config.json</code>. Agents have access to assigned repos for code changes.
                </p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="font-semibold">Model Selection</h2>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm text-zinc-400">
                <p>Each routing rule specifies which model to use for that agent:</p>
                <div className="pl-3 space-y-1 text-xs">
                  <div>• <span className="text-orange-400">Haiku</span> - Fast, low-cost (data pulls, simple tasks)</div>
                  <div>• <span className="text-orange-400">Sonnet</span> - Balanced (most tasks, default)</div>
                  <div>• <span className="text-orange-400">Opus</span> - Most capable (complex reasoning)</div>
                </div>
                <p className="pt-2">To change an agent's default model, edit the routing rule above.</p>
                <p className="text-xs text-zinc-500">Future: Per-agent model preferences in agent settings</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="font-semibold">Router Stats</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Total Rules</span>
                  <span className="font-medium">{rules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Active Rules</span>
                  <span className="font-medium text-green-400">{rules.filter(r => r.enabled).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Messages Routed</span>
                  <span className="font-medium">247</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Hit Rate</span>
                  <span className="font-medium">68%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Rule Info Modal */}
        {(editingRule || showAddRule) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {editingRule ? `Edit Rule: ${editingRule.name}` : 'Add New Rule'}
                </h3>
                <button 
                  onClick={() => {
                    setEditingRule(null);
                    setShowAddRule(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-zinc-950 rounded-lg p-4 mb-4">
                <div className="text-sm text-zinc-400 mb-2">Visual rule editor coming soon!</div>
                <div className="text-xs text-zinc-500 mb-4">For now, edit routing rules by modifying the JSON file directly.</div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-zinc-400 mb-1">1. Open routing rules file:</div>
                    <code className="block bg-black/50 p-2 rounded text-orange-400 text-xs">
                      ~/.openclaw/workspace/routing-rules.json
                    </code>
                  </div>

                  {editingRule && (
                    <div>
                      <div className="text-zinc-400 mb-1">2. Find rule with ID:</div>
                      <code className="block bg-black/50 p-2 rounded text-orange-400 text-xs">
                        "{editingRule.id}"
                      </code>
                    </div>
                  )}

                  <div>
                    <div className="text-zinc-400 mb-1">{editingRule ? '3' : '2'}. Edit the JSON:</div>
                    <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-zinc-300">
{`{
  "id": "dev-1",
  "name": "Lead Developer - Code & Infrastructure",
  "enabled": true,
  "priority": 1,
  "conditions": {
    "channels": ["#dev"],
    "keywords": ["code", "bug", "fix"]
  },
  "action": {
    "agent": "lead-developer",
    "model": "claude-sonnet-4",
    "spawnNew": false
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <div className="text-zinc-400 mb-1">{editingRule ? '4' : '3'}. Reload this page to see changes</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setShowAddRule(false);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  Close
                </button>
                <Link
                  href="/workspace?file=routing-rules.json"
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-center transition"
                >
                  Open in Workspace Browser
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
