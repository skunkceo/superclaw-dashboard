#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Create a demo task to show on dashboard
const demoTask = {
  id: 'demo-porter-task',
  title: 'Build Porter orchestration system + Tasks UI for SuperClaw dashboard',
  status: 'active',
  assigned_agent: 'developer',
  what_doing: 'Building task-centric dashboard interface with colored lobster icons',
  completed_at: null,
  session_id: null,
};

const stmt = db.prepare(`
  INSERT OR REPLACE INTO tasks (id, title, status, assigned_agent, what_doing, completed_at, session_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

stmt.run(
  demoTask.id, demoTask.title, demoTask.status, demoTask.assigned_agent,
  demoTask.what_doing, demoTask.completed_at, demoTask.session_id
);

console.log('✅ Created demo task:', demoTask.title);

db.close();