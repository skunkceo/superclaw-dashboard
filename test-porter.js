#!/usr/bin/env node

// Test Porter routing logic with the new handoff rules
const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Import Porter logic (simplified version for testing)
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

      // Check if rule matches the text
      if (text.includes(ruleText)) {
        // Longer rules get higher scores (more specific matches)
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

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.length > 0 ? matches[0] : { agentId: 'developer', agentName: 'Developer', score: 0, matchedRules: [] };
}

// Test cases
const testTasks = [
  { title: 'Improve SEO rankings for blog posts', description: 'Check GSC data and optimize content' },
  { title: 'Fix dashboard bug in user interface', description: 'The build is failing and needs code review' },
  { title: 'Write blog post about WordPress', description: 'Create content for the marketing campaign' },
  { title: 'Post on r/WordPress about our plugin', description: 'Social media outreach on Reddit' },
  { title: 'Check Google Search Console rankings', description: '' },
  { title: 'Deploy new feature to production', description: 'Infrastructure and deployment task' },
];

console.log('=== Testing Porter Routing with Handoff Rules ===\n');

for (const task of testTasks) {
  const result = assignAgentByPorter(task.title, task.description);
  
  console.log(`Task: "${task.title}"`);
  if (task.description) {
    console.log(`Description: "${task.description}"`);
  }
  console.log(`→ Assigned to: ${result.agentName} (score: ${result.score})`);
  
  if (result.matchedRules && result.matchedRules.length > 0) {
    console.log(`  Matched rules: ${result.matchedRules.join(', ')}`);
  } else {
    console.log(`  No rules matched - using fallback`);
  }
  console.log('');
}

db.close();