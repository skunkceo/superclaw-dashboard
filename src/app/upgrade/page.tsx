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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* FREE Tier */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-4xl font-bold text-zinc-400 mb-1">$0</div>
              <div className="text-sm text-zinc-500">Forever free</div>
            </div>

            <div className="mb-8 text-sm text-zinc-400">
              {licenseStatus?.hasLicense ? (
                <span className="text-zinc-500">Previous tier</span>
              ) : (
                <span className="text-green-400 font-medium">Current plan</span>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                <span>Basic dashboard</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                <span>Health monitoring</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                <span>Chat interface</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                <span>Skills browser</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-zinc-600 mt-0.5">✓</span>
                <span>Basic token tracking</span>
              </li>
            </ul>

            <div className="text-center text-sm text-zinc-500">
              {licenseStatus?.hasLicense ? 'Included' : 'Active'}
            </div>
          </div>

          {/* PRO Tier - Best Value */}
          <div className="bg-gradient-to-br from-orange-900/30 to-amber-900/20 border-2 border-orange-500/50 rounded-xl p-8 flex flex-col relative shadow-2xl shadow-orange-500/20">
            {/* Best Value Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-xs font-bold text-white shadow-lg">
              BEST VALUE
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent mb-2">
                Pro
              </h3>
              <div className="text-5xl font-bold text-white mb-1">$99</div>
              <div className="text-sm text-zinc-400">One-time • Lifetime access</div>
            </div>

            <div className="mb-8 text-sm">
              <span className="inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400">
                Includes OpenClaw Guide
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2 text-sm text-white">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span className="font-medium">Everything in Free, plus:</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>Advanced analytics & insights</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>Automation & workflows</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>Multi-user support</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>14-chapter OpenClaw Guide</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-500 mt-0.5">✓</span>
                <span>Early access to new features</span>
              </li>
            </ul>

            <a
              href="https://skunkglobal.com/guides/openclaw-wordpress"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-semibold text-white"
            >
              Get Pro Access
            </a>
          </div>

          {/* ENTERPRISE Tier */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-white mb-1">Custom</div>
              <div className="text-sm text-zinc-500">Tailored to your needs</div>
            </div>

            <div className="mb-8 text-sm text-zinc-500">
              For teams & organizations
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-2 text-sm text-white">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span className="font-medium">Everything in Pro, plus:</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>Dedicated support</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>Custom integrations</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>Team training</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>SLA guarantees</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>On-premise deployment</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-0.5">✓</span>
                <span>Custom feature development</span>
              </li>
            </ul>

            <a
              href="mailto:hello@skunkglobal.com?subject=SuperClaw Enterprise Inquiry"
              className="block w-full text-center px-6 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all font-semibold text-white"
            >
              Contact Us
            </a>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-12 text-center">
          <a href="/settings" className="text-sm text-zinc-400 hover:text-orange-400 transition-colors">
            Already have a license key? Activate it here
          </a>
        </div>
      </div>
    </div>
  );
}
