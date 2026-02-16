'use client';

import { useState, useEffect } from 'react';

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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Settings</h1>
            <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* License Status Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">License Status</h2>
          
          {licenseStatus?.hasLicense ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">✓</div>
                <div>
                  <div className="font-semibold text-lg">SuperClaw Pro Active</div>
                  <div className="text-sm text-gray-400">Tier: {licenseStatus.tier.toUpperCase()}</div>
                </div>
              </div>
              {licenseStatus.email && (
                <div className="text-sm text-gray-400">
                  Licensed to: <span className="text-white">{licenseStatus.email}</span>
                </div>
              )}
              <div className="text-sm text-gray-400 mt-2">
                Activated: <span className="text-white">{new Date(licenseStatus.activatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <div className="font-semibold">Free Tier</div>
                  <div className="text-sm text-gray-400">Upgrade to unlock Pro features</div>
                </div>
              </div>
              <a
                href="/upgrade"
                className="inline-block px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-sm font-medium"
              >
                View Pro Features
              </a>
            </div>
          )}
        </div>

        {/* Activate License Section */}
        {!licenseStatus?.hasLicense && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Activate License</h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label htmlFor="licenseKey" className="block text-sm font-medium mb-2">
                    License Key
                  </label>
                  <input
                    type="text"
                    id="licenseKey"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for license recovery and updates
                  </p>
                </div>

                {message && (
                  <div
                    className={`p-4 rounded-lg ${
                      message.type === 'success'
                        ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                        : 'bg-red-900/20 border border-red-500/30 text-red-400'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={validating || !licenseKey.trim()}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                >
                  {validating ? 'Validating...' : 'Activate License'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  Don't have a license key?{' '}
                  <a href="/upgrade" className="text-orange-500 hover:text-orange-400">
                    Get SuperClaw Pro
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Settings Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">General Settings</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-gray-400 text-sm">
              More settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
