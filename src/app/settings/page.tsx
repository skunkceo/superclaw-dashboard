'use client';

import { useState, useEffect } from 'react';
import { LobsterLogo } from '@/components/LobsterLogo';

export default function SettingsPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const fetchLicenseStatus = async () => {
    try {
      const res = await fetch('/api/license/status');
      const data = await res.json();
      setLicenseStatus(data);
    } catch (error) {
      console.error('Failed to fetch license status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, email }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setMessage({ type: 'success', text: 'License activated successfully!' });
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Invalid license key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to validate license. Please try again.' });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <LobsterLogo className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-zinc-400">Manage your SuperClaw configuration and license</p>
        </div>

        {/* License Status Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-white">License Status</h2>
          
          {licenseStatus?.hasLicense ? (
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <LobsterLogo className="w-12 h-12" />
                <div>
                  <div className="font-semibold text-xl text-green-400">SuperClaw Pro Active</div>
                  <div className="text-sm text-zinc-400">Tier: {licenseStatus.tier.toUpperCase()}</div>
                </div>
              </div>
              {licenseStatus.email && (
                <div className="text-sm text-zinc-400 mb-2">
                  Licensed to: <span className="text-white">{licenseStatus.email}</span>
                </div>
              )}
              <div className="text-sm text-zinc-400">
                Activated: <span className="text-white">{new Date(licenseStatus.activatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <LobsterLogo className="w-12 h-12 opacity-50" />
                <div>
                  <div className="font-semibold text-lg text-white">Free Tier</div>
                  <div className="text-sm text-zinc-400">Upgrade to unlock Pro features</div>
                </div>
              </div>
              <a
                href="/upgrade"
                className="inline-block px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 text-sm font-medium text-white"
              >
                View Pro Features
              </a>
            </div>
          )}
        </div>

        {/* Activate License Section */}
        {!licenseStatus?.hasLicense && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-white">Activate License</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <form onSubmit={handleActivate} className="space-y-5">
                <div>
                  <label htmlFor="licenseKey" className="block text-sm font-medium mb-2 text-zinc-300">
                    License Key
                  </label>
                  <input
                    type="text"
                    id="licenseKey"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-zinc-300">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Used for license recovery and updates
                  </p>
                </div>

                {message && (
                  <div
                    className={`p-4 rounded-lg border ${
                      message.type === 'success'
                        ? 'bg-green-900/20 border-green-500/30 text-green-400'
                        : 'bg-red-900/20 border-red-500/30 text-red-400'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={validating || !licenseKey.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-medium text-white"
                >
                  {validating ? 'Validating...' : 'Activate License'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <p className="text-sm text-zinc-400">
                  Don't have a license key?{' '}
                  <a href="/upgrade" className="text-orange-500 hover:text-orange-400 transition-colors">
                    Get SuperClaw Pro
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Settings Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-white">General Settings</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-400 text-sm">
              More settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
