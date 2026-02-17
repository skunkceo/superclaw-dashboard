'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const validateLicense = async () => {
    setValidating(true);
    setResult(null);

    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });

      const data = await response.json();

      if (data.valid) {
        setResult({
          success: true,
          message: 'Pro license activated! Refresh the page to access Pro features.'
        });
      } else {
        setResult({
          success: false,
          message: data.message || 'Invalid license key'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to validate license. Please try again.'
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-zinc-400">Manage your SuperClaw installation</p>
        </div>

        <div className="space-y-6">
          {/* Pro License Section */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">SuperClaw Pro License</h2>
                  <p className="text-sm text-zinc-400 mt-1">Unlock advanced features and workflows</p>
                </div>
                <Link
                  href="/upgrade"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg text-black font-medium text-sm transition-all"
                >
                  Get Pro
                </Link>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="license-key" className="block text-sm font-medium text-zinc-300 mb-2">
                  License Key
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    id="license-key"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Enter your Pro license key"
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-white placeholder-zinc-500 font-mono text-sm"
                    disabled={validating}
                  />
                  <button
                    onClick={validateLicense}
                    disabled={!licenseKey || validating}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {validating ? 'Validating...' : 'Activate'}
                  </button>
                </div>
              </div>

              {result && (
                <div className={`p-4 rounded-lg ${
                  result.success 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                      {result.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h3 className="text-sm font-medium text-white mb-3">Pro Features</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Specialized Agents (MarTech, CRM, SEO)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Smart Message Router (auto-route by keywords)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Ephemeral Sandboxes (parallel git worktrees)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Task Management Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Priority Support</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-400">
                  <strong className="text-white">Need a license?</strong> Purchase SuperClaw Pro at{' '}
                  <a 
                    href="https://skunkglobal.com/superclaw-dashboard-pro/checkout" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 hover:underline"
                  >
                    skunkglobal.com/superclaw-dashboard-pro
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* OpenClaw Configuration */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">OpenClaw Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Workspace Path
                </label>
                <div className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg font-mono text-sm text-zinc-400">
                  {process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace'}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Configured via .env file. Run <code className="px-1.5 py-0.5 bg-zinc-800 rounded">superclaw setup agents</code> to update.
                </p>
              </div>
            </div>
          </div>

          {/* Version Information */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Updates</h2>
              <Link
                href="/versions"
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                View Details →
              </Link>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              SuperClaw can automatically check for and install updates to the dashboard and OpenClaw gateway.
            </p>
            
            <Link
              href="/versions"
              className="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition-colors"
            >
              Check for Updates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
