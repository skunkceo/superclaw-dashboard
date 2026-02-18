'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LobsterLogo } from './LobsterLogo';
import { useAuth } from './AuthWrapper';
import { useState, useEffect } from 'react';

interface HeaderProps {
  healthStatus?: 'healthy' | 'degraded' | 'offline';
}

interface VersionInfo {
  dashboard: {
    current: string;
    latest: string;
    updateAvailable: boolean;
    changelog: string | null;
  };
  openclaw: {
    current: string;
    latest: string;
    updateAvailable: boolean;
    isLegacy: boolean;
    changelog: string | null;
  };
}

export function Header({ healthStatus = 'healthy' }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const hasAnyUpdate = versionInfo?.dashboard?.updateAvailable || 
                       versionInfo?.openclaw?.updateAvailable || 
                       versionInfo?.openclaw?.isLegacy;

  useEffect(() => {
    // Check for updates on mount
    fetch('/api/versions')
      .then(res => res.json())
      .then(setVersionInfo)
      .catch(() => {});
  }, []);

  const [proactivityStats, setProactivityStats] = useState<{ unread: number; pending: number } | null>(null);

  useEffect(() => {
    // Check for unread intel / pending suggestions for badge
    Promise.all([
      fetch('/api/intel?stats=true').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/suggestions?stats=true').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([intel, sug]) => {
      if (intel || sug) {
        setProactivityStats({
          unread: intel?.unread || 0,
          pending: sug?.pending || 0,
        });
      }
    });
  }, []);

  const navItems: Array<{ href: string; label: string; badge?: number }> = [
    { href: '/', label: 'Dashboard' },
    { href: '/agents', label: 'Agents' },
    { href: '/router', label: 'Router' },
    { href: '/proactivity', label: 'Proactivity', badge: proactivityStats ? proactivityStats.pending + proactivityStats.unread : 0 },
    { href: '/reports', label: 'Reports' },
    ...(hasRole('edit') ? [{ href: '/workspace', label: 'Workspace' }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Update Banner */}
      {hasAnyUpdate && !updateDismissed && (
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-b border-orange-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {versionInfo?.dashboard?.updateAvailable && (
                <span className="flex items-center gap-2">
                  <span className="text-zinc-400">Dashboard:</span>
                  <a 
                    href={versionInfo.dashboard.changelog || '/versions'}
                    target={versionInfo.dashboard.changelog ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 font-medium"
                  >
                    v{versionInfo.dashboard.latest}
                  </a>
                </span>
              )}
              {(versionInfo?.openclaw?.updateAvailable || versionInfo?.openclaw?.isLegacy) && (
                <span className="flex items-center gap-2">
                  <span className="text-zinc-400">OpenClaw:</span>
                  <a 
                    href={versionInfo.openclaw.changelog || '/versions'}
                    target={versionInfo.openclaw.changelog ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 font-medium"
                  >
                    v{versionInfo.openclaw.latest}
                  </a>
                  {versionInfo.openclaw.isLegacy && (
                    <span className="text-yellow-400 text-xs">(migration needed)</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/versions" className="text-xs text-orange-400 hover:text-orange-300">
                View details
              </Link>
              <button
                onClick={() => setUpdateDismissed(true)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <LobsterLogo className="w-8 h-8" />
              <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                SuperClaw
              </span>
            </Link>
          </div>

          {/* Desktop Nav (centered) */}
          <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Update notification */}
            {hasAnyUpdate && (
              <Link
                href="/versions"
                className="relative p-2 text-orange-400 hover:text-orange-300 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Updates available"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </Link>
            )}

            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-800/50">
              <span className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy' ? 'bg-green-400 animate-pulse' :
                healthStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-zinc-400 capitalize">{healthStatus}</span>
            </div>

            {/* Upgrade button (always visible) */}
            <Link
              href="/upgrade"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg font-medium text-white text-sm transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade
            </Link>

            {/* Chat button */}
            <Link
              href="/chat"
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-white text-sm transition-all"
            >
              Chat
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <span className="w-7 h-7 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </button>
              
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 z-50">
                    <div className="px-4 py-3 border-b border-zinc-700">
                      <div className="text-sm text-white truncate">{user?.email}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{user?.role}</div>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link
                      href="/upgrade"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-zinc-700/50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Upgrade to Pro
                    </Link>
                    <Link
                      href="/errors"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50 border-t border-zinc-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Errors
                    </Link>
                    <Link
                      href="/versions"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      Versions
                    </Link>
                    {hasRole('admin') && (
                      <Link
                        href="/users"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50 border-t border-zinc-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Manage Users
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700/50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-zinc-800 rounded-lg"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {showMobileMenu && (
          <nav className="md:hidden py-3 border-t border-zinc-800">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
