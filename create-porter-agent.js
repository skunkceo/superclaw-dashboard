#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Create Porter agent - the orchestrator that routes tasks to specialist agents
const porterAgent = {
  id: 'porter',
  name: 'Porter',
  description: 'Task orchestrator that intelligently routes work to specialist agents',
  soul: 'You are Porter, the intelligent task orchestrator. Your role is to analyze incoming tasks and route them to the most appropriate specialist agent based on their handoff rules and expertise.',
  model: 'claude-sonnet-4-20250514',
  skills: JSON.stringify(['task-routing', 'agent-orchestration', 'project-management']),
  tools: JSON.stringify(['web-search', 'read', 'write']),
  color: 'rgb(249, 115, 22)', // orange-500
  icon: 'porter',
  memory_dir: null,
  system_prompt: 'You are the central orchestrator. Analyze tasks, understand requirements, and intelligently delegate to specialist agents. Always explain your routing decisions.',
  max_tokens: null,
  thinking: 'medium',
  handoff_rules: JSON.stringify([
    'task routing', 'agent assignment', 'orchestration', 'delegation', 'project coordination'
  ]),
  enabled: true, // Porter is always enabled
  created_by: 1, // admin user
  spawn_count: 0
};

try {
  const stmt = db.prepare(`
    INSERT INTO agent_definitions (id, name, description, soul, model, skills, tools, color, icon, memory_dir, system_prompt, max_tokens, thinking, handoff_rules, enabled, created_by, spawn_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    porterAgent.id, porterAgent.name, porterAgent.description, porterAgent.soul,
    porterAgent.model, porterAgent.skills, porterAgent.tools, porterAgent.color,
    porterAgent.icon, porterAgent.memory_dir, porterAgent.system_prompt,
    porterAgent.max_tokens, porterAgent.thinking, porterAgent.handoff_rules,
    porterAgent.enabled ? 1 : 0, porterAgent.created_by, porterAgent.spawn_count
  );

  console.log('✅ Created Porter agent successfully!');
  console.log(`   Name: ${porterAgent.name}`);
  console.log(`   Description: ${porterAgent.description}`);
  console.log(`   Color: ${porterAgent.color} (orange)`);
  console.log(`   Always Active: ${porterAgent.enabled ? 'Yes' : 'No'}`);
  console.log('');
  console.log('🔒 Porter cannot be disabled - it will show a lock icon instead of a toggle switch');
  console.log('   This ensures task routing always works properly.');

} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  Porter agent already exists');
  } else {
    console.error('❌ Error creating Porter agent:', error.message);
  }
}

db.close();