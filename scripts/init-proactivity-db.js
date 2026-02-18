#!/usr/bin/env node
/**
 * init-proactivity-db.js
 * Creates the proactivity module tables in the SuperClaw database.
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 *
 * Usage: node scripts/init-proactivity-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dataDir = process.env.SUPERCLAW_DATA_DIR || '/home/mike/.superclaw';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'superclaw.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS intel_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    url TEXT,
    source TEXT NOT NULL DEFAULT 'brave',
    relevance_score INTEGER DEFAULT 50,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    read_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_intel_category ON intel_items(category);
  CREATE INDEX IF NOT EXISTS idx_intel_created ON intel_items(created_at);

  CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    why TEXT NOT NULL,
    effort TEXT NOT NULL,
    impact TEXT NOT NULL,
    impact_score INTEGER DEFAULT 50,
    category TEXT NOT NULL,
    source_intel_ids TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 3,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    actioned_at INTEGER,
    notes TEXT,
    report_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
  CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON suggestions(priority);
  CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions(created_at);

  CREATE TABLE IF NOT EXISTS overnight_runs (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    status TEXT NOT NULL DEFAULT 'running',
    tasks_started INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    summary TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_overnight_status ON overnight_runs(status);

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    suggestion_id TEXT,
    overnight_run_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
  CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);

  CREATE TABLE IF NOT EXISTS proactivity_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`);

// Seed default settings
const defaults = {
  overnight_mode: 'false',
  overnight_start_time: '00:00',
  overnight_end_time: '06:00',
  intel_refresh_interval_hours: '6',
  suggestion_auto_generate: 'true',
  last_intel_refresh: '0',
  last_suggestion_run: '0',
};

for (const [key, value] of Object.entries(defaults)) {
  db.prepare('INSERT OR IGNORE INTO proactivity_settings (key, value) VALUES (?, ?)').run(key, value);
}

console.log('Proactivity DB tables created successfully.');
db.close();
