#!/usr/bin/env node
/**
 * post-report.js
 * Post a report directly to the SuperClaw database.
 *
 * Usage: node scripts/post-report.js <title> <type> [suggestion_id] [content_file]
 *
 * If no content_file given, reads content from stdin.
 * Types: sprint, research, seo, competitor, content, intelligence, general
 *
 * Example:
 *   echo "# My Report\n\nContent here" | node scripts/post-report.js "Weekly SEO" seo
 *   node scripts/post-report.js "Competitor Analysis" competitor abc-suggestion-id ./report.md
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { randomUUID } = require('crypto');

const dataDir = process.env.SUPERCLAW_DATA_DIR || path.join(os.homedir(), '.superclaw');
const db = new Database(path.join(dataDir, 'superclaw.db'));

const [,, title, type, suggestionId, contentFile] = process.argv;

if (!title || !type) {
  console.error('Usage: node post-report.js <title> <type> [suggestion_id] [content_file]');
  console.error('Types: sprint, research, seo, competitor, content, intelligence, general');
  process.exit(1);
}

function readContent(file) {
  if (file) {
    return fs.readFileSync(file, 'utf8');
  }
  // Read from stdin
  return fs.readFileSync('/dev/stdin', 'utf8');
}

try {
  const content = readContent(contentFile);
  const id = randomUUID();
  const now = Date.now();

  // Ensure table exists (safe if db.ts already created it)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      suggestion_id TEXT,
      overnight_run_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.prepare(`
    INSERT INTO reports (id, title, type, content, suggestion_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, type, content, suggestionId || null, now);

  // If suggestion_id given, mark it completed
  if (suggestionId) {
    const existing = db.prepare('SELECT id FROM suggestions WHERE id = ?').get(suggestionId);
    if (existing) {
      db.prepare('UPDATE suggestions SET status = ?, report_id = ?, actioned_at = ? WHERE id = ?')
        .run('completed', id, now, suggestionId);
    }
  }

  console.log(JSON.stringify({ success: true, reportId: id, title, type }));
} catch (err) {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}
