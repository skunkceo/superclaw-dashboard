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
  current: string;
  latest: string;
  updateAvailable: boolean;
  changelog: string | null;
}

export function Header({ healthStatus = 'healthy' }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    fetch('/api/version')
      .then(res => res.json())
      .then(setVersionInfo)
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/agents', label: 'Agents', icon: '🤖' },
    { href: '/scheduled', label: 'Scheduled', icon: '📅' },
    { href: '/models', label: 'Models', icon: '🧠' },
    ...(hasRole('edit') ? [{ href: '/workspace', label: 'Workspace', icon: '📁' }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Update Banner */}
      {versionInfo?.updateAvailable && !updateDismissed && (
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-b border-orange-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-orange-400">Update available:</span>
              <span className="text-white font-medium">v{versionInfo.latest}</span>
              <span className="text-zinc-400">(current: v{versionInfo.current})</span>
            </div>
            <div className="flex items-center gap-3">
              {versionInfo.changelog && (
                <a 
                  href={versionInfo.changelog}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  View changelog
                </a>
              )}
              <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                superclaw update
              </code>
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
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <LobsterLogo className="w-8 h-8" />
            <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              Superclaw
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-800/50">
              <span className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy' ? 'bg-green-400 animate-pulse' :
                healthStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-zinc-400 capitalize">{healthStatus}</span>
            </div>

            {/* Chat button */}
            <Link
              href="/chat"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-1.5 rounded-lg font-medium text-white text-sm transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
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
                    {hasRole('admin') && (
                      <Link
                        href="/users"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span>👥</span> Manage Users
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700/50"
                    >
                      <span>🚪</span> Sign out
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <span>{item.icon}</span>
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
