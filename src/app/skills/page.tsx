'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LobsterLogo } from '@/components/LobsterLogo';

// Bundled Clawdbot skills (from /skills/ directory)
const bundledSkills = [
  { id: 'weather', name: 'Weather', category: 'Utilities', description: 'Get weather forecasts via wttr.in - no API key needed', enabled: true },
  { id: 'browser', name: 'Browser Control', category: 'Automation', description: 'Control web browser for automation and scraping', enabled: true },
  { id: 'github', name: 'GitHub', category: 'Developer', description: 'Manage repos, PRs, issues, and actions', enabled: true },
  { id: 'slack', name: 'Slack', category: 'Communication', description: 'Send messages, manage channels, react to messages', enabled: true },
  { id: 'notion', name: 'Notion', category: 'Productivity', description: 'Read and write Notion pages and databases', enabled: false },
  { id: 'coding-agent', name: 'Coding Agent', category: 'Developer', description: 'Run Claude Code, Codex, or other coding agents', enabled: false },
  { id: 'tmux', name: 'Tmux Control', category: 'Developer', description: 'Remote-control tmux sessions for interactive CLIs', enabled: false },
  { id: 'himalaya', name: 'Email (Himalaya)', category: 'Communication', description: 'Email client via Himalaya CLI', enabled: false },
  { id: 'openai-image-gen', name: 'Image Generation', category: 'AI', description: 'Generate images via OpenAI DALL-E', enabled: false },
  { id: 'openai-whisper', name: 'Speech-to-Text', category: 'AI', description: 'Transcribe audio via Whisper', enabled: false },
  { id: 'sag', name: 'Text-to-Speech', category: 'AI', description: 'ElevenLabs TTS for voice output', enabled: false },
  { id: 'trello', name: 'Trello', category: 'Productivity', description: 'Manage Trello boards and cards', enabled: false },
  { id: 'spotify-player', name: 'Spotify', category: 'Media', description: 'Control Spotify playback', enabled: false },
  { id: 'sonoscli', name: 'Sonos', category: 'Media', description: 'Control Sonos speakers', enabled: false },
  { id: 'openhue', name: 'Philips Hue', category: 'Smart Home', description: 'Control Hue lights', enabled: false },
  { id: 'camsnap', name: 'Camera Snap', category: 'Media', description: 'Capture from connected cameras', enabled: false },
  { id: 'discord', name: 'Discord', category: 'Communication', description: 'Discord bot integration', enabled: false },
  { id: 'gifgrep', name: 'GIF Search', category: 'Media', description: 'Search and send GIFs', enabled: false },
  { id: 'gemini', name: 'Gemini', category: 'AI', description: 'Google Gemini model integration', enabled: false },
  { id: 'peekaboo', name: 'Peekaboo', category: 'macOS', description: 'macOS screenshot and OCR', enabled: false },
  { id: 'apple-notes', name: 'Apple Notes', category: 'macOS', description: 'Read and write Apple Notes', enabled: false },
  { id: 'apple-reminders', name: 'Apple Reminders', category: 'macOS', description: 'Manage Apple Reminders', enabled: false },
  { id: 'bear-notes', name: 'Bear Notes', category: 'macOS', description: 'Bear note-taking app', enabled: false },
  { id: 'things-mac', name: 'Things 3', category: 'macOS', description: 'Things 3 task manager', enabled: false },
  { id: 'obsidian', name: 'Obsidian', category: 'Productivity', description: 'Obsidian vault management', enabled: false },
];

// Skunk Global skills (from skills-data.ts)
const skunkSkills = [
  { id: 'wp-site-health', name: 'WordPress Site Health', category: 'WordPress', description: 'Check plugin updates, security status, and performance metrics', featured: true },
  { id: 'wp-content-manager', name: 'WordPress Content Manager', category: 'WordPress', description: 'Create, edit, and schedule posts with AI assistance' },
  { id: 'wp-backup', name: 'WordPress Backup', category: 'WordPress', description: 'Automated database and file backups with cloud support' },
  { id: 'woocommerce-manager', name: 'WooCommerce Manager', category: 'WordPress', description: 'Manage products, orders, and inventory' },
  { id: 'seo-analyzer', name: 'SEO Analyzer', category: 'SEO', description: 'Analyze pages for SEO issues and get recommendations', featured: true },
  { id: 'keyword-research', name: 'Keyword Research', category: 'SEO', description: 'Find keyword opportunities with volume and competition data' },
  { id: 'gsc-reporter', name: 'GSC Reporter', category: 'SEO', description: 'Pull Google Search Console data and generate reports' },
  { id: 'social-scheduler', name: 'Social Scheduler', category: 'Social', description: 'Schedule posts across multiple social platforms', featured: true },
  { id: 'twitter-monitor', name: 'Twitter/X Monitor', category: 'Social', description: 'Monitor mentions, hashtags, and competitors' },
  { id: 'email-manager', name: 'Email Manager', category: 'Productivity', description: 'Read, organize, and draft emails with smart prioritization' },
  { id: 'calendar-sync', name: 'Calendar Sync', category: 'Productivity', description: 'Manage calendar events and get scheduling suggestions' },
  { id: 'notion-connector', name: 'Notion Connector', category: 'Productivity', description: 'Full Notion API integration' },
  { id: 'stripe-manager', name: 'Stripe Manager', category: 'APIs', description: 'Manage payments, subscriptions, and customers' },
  { id: 'slack-bot', name: 'Slack Bot', category: 'APIs', description: 'Full Slack API integration with workflows' },
  { id: 'webhook-handler', name: 'Webhook Handler', category: 'APIs', description: 'Receive and process webhooks from any service' },
  { id: 'github-manager', name: 'GitHub Manager', category: 'Developer', description: 'Full GitHub API via gh CLI', featured: true },
  { id: 'docker-manager', name: 'Docker Manager', category: 'Developer', description: 'Build, run, and manage containers' },
  { id: 'db-query', name: 'Database Query', category: 'Developer', description: 'Execute SQL queries against MySQL, PostgreSQL, SQLite' },
];

const categories = ['All', 'WordPress', 'SEO', 'Developer', 'Productivity', 'Communication', 'AI', 'Automation', 'Media', 'Smart Home', 'macOS', 'Social', 'APIs', 'Utilities'];

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState<'bundled' | 'skunk'>('bundled');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const currentSkills = activeTab === 'bundled' ? bundledSkills : skunkSkills;
  
  const filteredSkills = currentSkills.filter(skill => {
    const matchesFilter = filter === 'All' || skill.category === filter;
    const matchesSearch = search === '' || 
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const currentCategories = [...new Set(currentSkills.map(s => s.category))];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <LobsterLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  Superclaw
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">Skills Directory</p>
              </div>
            </Link>
          </div>
          <Link 
            href="/"
            className="w-full sm:w-auto px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('bundled'); setFilter('All'); }}
            className={`px-4 sm:px-6 py-3 rounded-lg font-medium text-sm sm:text-base transition ${
              activeTab === 'bundled' 
                ? 'bg-orange-500 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Bundled Skills ({bundledSkills.length})
          </button>
          <button
            onClick={() => { setActiveTab('skunk'); setFilter('All'); }}
            className={`px-4 sm:px-6 py-3 rounded-lg font-medium text-sm sm:text-base transition ${
              activeTab === 'skunk' 
                ? 'bg-orange-500 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Skunk Skills ({skunkSkills.length})
          </button>
        </div>

        {/* Description */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
          {activeTab === 'bundled' ? (
            <>
              <h2 className="text-lg font-semibold mb-2">Bundled with OpenClaw</h2>
              <p className="text-zinc-400">
                These skills come pre-installed with OpenClaw/Clawdbot. Enable them in your config file or via the CLI.
                Some require additional setup (API keys, local apps, etc.).
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2">Skunk Global Skills</h2>
              <p className="text-zinc-400">
                Community skills built by Skunk Global for WordPress, SEO, and automation workflows.
                Install with: <code className="bg-zinc-800 px-2 py-1 rounded text-orange-400">openclaw skill install skunk-global/[skill-id]</code>
              </p>
            </>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500 transition text-sm sm:text-base"
          />
          <div className="overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-max">
              {['All', ...currentCategories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                    filter === cat 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <div 
              key={skill.id}
              className={`p-4 sm:p-5 rounded-xl border transition ${
                'enabled' in skill && skill.enabled
                  ? 'bg-orange-500/10 border-orange-500/30' 
                  : 'featured' in skill && skill.featured
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-base sm:text-lg">{skill.name}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">{skill.category}</div>
                </div>
                <div className="flex-shrink-0">
                  {'enabled' in skill && (
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                      skill.enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {skill.enabled ? 'Enabled' : 'Available'}
                    </span>
                  )}
                  {'featured' in skill && skill.featured && (
                    <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 whitespace-nowrap">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-4 line-clamp-3">{skill.description}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {'enabled' in skill && !skill.enabled && (
                  <button className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
                    Enable
                  </button>
                )}
                {'featured' in skill && (
                  <button className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition">
                    Install
                  </button>
                )}
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition">
                  Docs
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No skills found matching your search.
          </div>
        )}
      </div>
    </main>
  );
}
