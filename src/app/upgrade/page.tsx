'use client';

import { useState, useEffect } from 'react';

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
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (licenseStatus?.hasLicense) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-2">SuperClaw Pro Active</h1>
            <p className="text-gray-400">You have full access to all Pro features.</p>
            <div className="mt-6 text-sm text-gray-500">
              Tier: <span className="text-white font-semibold">{licenseStatus.tier.toUpperCase()}</span>
            </div>
            <a href="/" className="mt-6 inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🦨</div>
              <h1 className="text-xl font-bold">SuperClaw Pro</h1>
            </div>
            <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Unlock the Full Power of OpenClaw</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get SuperClaw Pro with the OpenClaw Guide — one purchase, lifetime access.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold mb-2">$49</div>
              <div className="text-gray-400">One-time payment</div>
              <div className="text-sm text-orange-500 mt-2">Lifetime access • No subscription</div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-lg">What's Included:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <div className="font-medium">The OpenClaw Guide</div>
                    <div className="text-sm text-gray-400">14-chapter deep dive into mastering OpenClaw</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <div className="font-medium">SuperClaw Pro Dashboard</div>
                    <div className="text-sm text-gray-400">Advanced analytics, automation & multi-user</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <div className="font-medium">Private Updates</div>
                    <div className="text-sm text-gray-400">Exclusive features & early access</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <div className="font-medium">Priority Support</div>
                    <div className="text-sm text-gray-400">Direct access via Discord</div>
                  </div>
                </li>
              </ul>
            </div>

            <a
              href="https://skunkglobal.com/guides/openclaw-wordpress"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-6 py-4 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-semibold text-lg"
            >
              Get the Guide + Pro Access
            </a>

            <div className="mt-6 text-center">
              <a href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
                Already have a license key? Activate it here →
              </a>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
            <p className="text-gray-400 text-sm">
              Track token usage, costs, and model efficiency over time. Budget alerts and projections included.
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Automation</h3>
            <p className="text-gray-400 text-sm">
              Schedule tasks, create custom workflows, and batch operations. Let your AI work while you sleep.
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Multi-User</h3>
            <p className="text-gray-400 text-sm">
              Team dashboard with shared tasks, progress tracking, and permission management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
