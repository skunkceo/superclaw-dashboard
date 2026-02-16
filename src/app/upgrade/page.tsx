'use client';

import { useState, useEffect } from 'react';
import { LobsterLogo } from '@/components/LobsterLogo';

export default function UpgradePage() {
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LobsterLogo className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  if (licenseStatus?.hasLicense) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-8 text-center">
            <LobsterLogo className="w-20 h-20 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              SuperClaw Pro Active
            </h1>
            <p className="text-zinc-400 mb-6">You have full access to all Pro features.</p>
            <div className="text-sm text-zinc-500 mb-8">
              Tier: <span className="text-white font-semibold">{licenseStatus.tier.toUpperCase()}</span>
            </div>
            <a 
              href="/" 
              className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-medium"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <LobsterLogo className="w-24 h-24 mx-auto mb-8" />
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            Unlock the Full Power of OpenClaw
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Get SuperClaw Pro with the OpenClaw Guide — one purchase, lifetime access.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto mb-24">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                $99
              </div>
              <div className="text-zinc-400 text-lg">One-time payment</div>
              <div className="inline-block mt-3 px-4 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-sm text-orange-400">
                Lifetime access • No subscription
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-lg text-white">What's Included:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="text-orange-500 mt-1 text-lg">✓</div>
                  <div>
                    <div className="font-medium text-white">The OpenClaw Guide</div>
                    <div className="text-sm text-zinc-400">14-chapter deep dive into mastering OpenClaw</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-orange-500 mt-1 text-lg">✓</div>
                  <div>
                    <div className="font-medium text-white">SuperClaw Pro Dashboard</div>
                    <div className="text-sm text-zinc-400">Advanced analytics, automation & multi-user</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-orange-500 mt-1 text-lg">✓</div>
                  <div>
                    <div className="font-medium text-white">Private Updates</div>
                    <div className="text-sm text-zinc-400">Exclusive features & early access</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-orange-500 mt-1 text-lg">✓</div>
                  <div>
                    <div className="font-medium text-white">Priority Support</div>
                    <div className="text-sm text-zinc-400">Direct access via Discord</div>
                  </div>
                </li>
              </ul>
            </div>

            <a
              href="https://skunkglobal.com/guides/openclaw-wordpress"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-semibold text-lg text-white"
            >
              Get the Guide + Pro Access
            </a>

            <div className="mt-6 text-center">
              <a href="/settings" className="text-sm text-zinc-400 hover:text-orange-400 transition-colors">
                Already have a license key? Activate it here
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
            <div className="text-4xl mb-4 text-orange-500">📊</div>
            <h3 className="text-lg font-semibold mb-2 text-white">Advanced Analytics</h3>
            <p className="text-zinc-400 text-sm">
              Track token usage, costs, and model efficiency over time. Budget alerts and projections included.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
            <div className="text-4xl mb-4 text-orange-500">⚡</div>
            <h3 className="text-lg font-semibold mb-2 text-white">Automation</h3>
            <p className="text-zinc-400 text-sm">
              Schedule tasks, create custom workflows, and batch operations. Let your AI work while you sleep.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
            <div className="text-4xl mb-4 text-orange-500">👥</div>
            <h3 className="text-lg font-semibold mb-2 text-white">Multi-User</h3>
            <p className="text-zinc-400 text-sm">
              Team dashboard with shared tasks, progress tracking, and permission management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
