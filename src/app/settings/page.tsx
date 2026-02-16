'use client';

import { useEffect, useState } from 'react';

interface LicenseStatus {
  active: boolean;
  tier: 'free' | 'pro';
  features: string[];
  activatedAt?: number;
  expiresAt?: number;
  email?: string;
}

export default function SettingsPage() {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const fetchLicenseStatus = async () => {
    try {
      const res = await fetch('/api/license/status');
      if (res.ok) {
        const data = await res.json();
        setLicense(data);
      }
    } catch (err) {
      console.error('Failed to fetch license:', err);
    } finally {
      setLoading(false);
    }
  };

  const activateLicense = async () => {
    if (!licenseKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter a license key' });
      return;
    }

    setActivating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'License activated successfully!' });
        setLicenseKey('');
        // Refresh license status
        setTimeout(() => {
          fetchLicenseStatus();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to activate license' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to validate license. Check your connection.' });
    } finally {
      setActivating(false);
    }
  };

  const isPro = license?.active && license.tier === 'pro';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-400 mb-8">Manage your SuperClaw Pro license and preferences</p>

        {/* Current License Status */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">License Status</h2>
          
          <div className={`p-4 rounded-lg border mb-4 ${
            isPro
              ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30'
              : 'bg-zinc-800/50 border-zinc-700'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-bold">
                  {isPro ? 'SuperClaw Pro' : 'SuperClaw Free'}
                </div>
                {license?.email && (
                  <div className="text-sm text-zinc-400 mt-1">{license.email}</div>
                )}
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isPro
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : 'bg-zinc-700 text-zinc-300'
              }`}>
                {isPro ? 'Active' : 'Free Tier'}
              </span>
            </div>

            {isPro && license?.features && (
              <div className="border-t border-zinc-700 pt-3">
                <div className="text-sm font-medium text-zinc-400 mb-2">Active Features:</div>
                <div className="flex flex-wrap gap-2">
                  {license.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs"
                    >
                      {feature.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isPro && license?.activatedAt && (
              <div className="text-xs text-zinc-500 mt-3">
                Activated: {new Date(license.activatedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {!isPro && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-400 font-medium mb-1">Upgrade to SuperClaw Pro</p>
                  <p className="text-blue-400/80 text-xs mb-3">
                    Unlock Smart Model Router, Advanced Analytics, and more. Get your license key by purchasing the OpenClaw Guide.
                  </p>
                  <a
                    href="https://skunkglobal.com/guides/openclaw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Get OpenClaw Guide ($49) →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activate License */}
        {!isPro && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Activate Pro License</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">License Key</label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="SUPERCLAW-PRO-XXXX-XXXX-XXXX"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  disabled={activating}
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Enter the license key from your OpenClaw Guide purchase
                </p>
              </div>

              {message && (
                <div className={`p-3 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                onClick={activateLicense}
                disabled={activating || !licenseKey.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {activating ? 'Validating...' : 'Activate License'}
              </button>
            </div>
          </div>
        )}

        {/* Pro Features List */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Pro Features</h2>
          
          <div className="space-y-3">
            {[
              { name: 'Smart Model Router', desc: 'Automatic model selection for cost optimization' },
              { name: 'Advanced Analytics', desc: 'Detailed token usage and cost tracking' },
              { name: 'Priority Support', desc: 'Direct support channel and faster responses' },
              { name: 'Early Access', desc: 'New features before public release' },
            ].map((feature) => (
              <div key={feature.name} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <svg className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-green-400' : 'text-zinc-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-medium">{feature.name}</div>
                  <div className="text-sm text-zinc-400">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
