#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');
const { v4: uuidv4 } = require('uuid');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Simple Porter logic (same as in app)
function assignAgentByPorter(taskTitle, taskDescription) {
  const agents = db.prepare('SELECT id, name, handoff_rules FROM agent_definitions').all();
  
  if (agents.length === 0) {
    return 'developer'; // fallback
  }

  const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
  const matches = [];

  for (const agent of agents) {
    const handoffRules = JSON.parse(agent.handoff_rules || '[]');
    if (handoffRules.length === 0) continue;

    let score = 0;
    const matchedRules = [];

    for (const rule of handoffRules) {
      const ruleText = rule.toLowerCase().trim();
      if (!ruleText) continue;

      if (text.includes(ruleText)) {
        const ruleScore = ruleText.length;
        score += ruleScore;
        matchedRules.push(rule);
      }
    }

    if (score > 0) {
      matches.push({
        agentId: agent.id,
        agentName: agent.name,
        score,
        matchedRules,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.length > 0 ? matches[0].agentId : 'developer';
}

// Create a test task using Porter routing
const taskTitle = 'Analyze Google Search Console data for keyword optimization';
const assignedAgent = assignAgentByPorter(taskTitle);

// Get agent info for display
const agent = db.prepare('SELECT name FROM agent_definitions WHERE id = ?').get(assignedAgent);

const testTask = {
  id: uuidv4(),
  title: taskTitle,
  status: 'pending',
  assigned_agent: assignedAgent,
  what_doing: null,
  completed_at: null,
  session_id: null,
};

const stmt = db.prepare(`
  INSERT INTO tasks (id, title, status, assigned_agent, what_doing, completed_at, session_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

stmt.run(
  testTask.id, testTask.title, testTask.status, testTask.assigned_agent,
  testTask.what_doing, testTask.completed_at, testTask.session_id
);

console.log('✅ Created test task with Porter routing:');
console.log(`   Title: "${testTask.title}"`);
console.log(`   Assigned to: ${agent?.name || assignedAgent}`);
console.log(`   Task ID: ${testTask.id}`);
console.log('');
console.log('🎯 Porter successfully assigned this task based on handoff rules!');
console.log('   Check the dashboard to see it in the Tasks widget.');

db.close();