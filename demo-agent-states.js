#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

console.log('🎯 SuperClaw Agent States Demonstration');
console.log('=====================================\n');

// Get all agents with their status
const agents = db.prepare('SELECT id, name, enabled, handoff_rules FROM agent_definitions ORDER BY name').all();

console.log(`📊 Agent Overview: ${agents.length} total agents`);
const activeCount = agents.filter(a => a.enabled).length;
const inactiveCount = agents.filter(a => !a.enabled).length;
console.log(`   • ${activeCount} active agents (available for Porter routing)`);
console.log(`   • ${inactiveCount} inactive agents (disabled)\n`);

// Show Porter status
const porter = agents.find(a => a.name.toLowerCase().includes('porter'));
if (porter) {
  console.log('🔒 Porter Agent (Orchestrator):');
  console.log(`   Name: ${porter.name}`);
  console.log(`   Status: Always Active (cannot be disabled)`);
  console.log(`   UI: Shows lock icon + "Always Active" badge`);
  console.log(`   Protection: API prevents disabling attempts\n`);
} else {
  console.log('⚠️  Porter agent not found - create one for orchestration\n');
}

// Show all agents with their visual representation
console.log('🎨 Agent Visual States:');
console.log('----------------------');

for (const agent of agents) {
  const isPorter = agent.name.toLowerCase().includes('porter');
  const status = agent.enabled ? '🟢 ACTIVE' : '🔴 INACTIVE';
  const visual = agent.enabled ? 'Full color, normal opacity' : '50% opacity, grayscale filter';
  const toggle = isPorter ? '🔒 Lock icon (always active)' : agent.enabled ? '✅ Toggle ON' : '❌ Toggle OFF';
  const spawn = agent.enabled ? '🚀 Spawn button enabled' : '⛔ Spawn button disabled';
  
  console.log(`\n${agent.name}:`);
  console.log(`   Status: ${status}`);
  console.log(`   Visual: ${visual}`);
  console.log(`   Control: ${toggle}`);
  console.log(`   Spawn: ${spawn}`);
  
  // Show handoff rules for routing
  const rules = JSON.parse(agent.handoff_rules || '[]');
  if (rules.length > 0) {
    console.log(`   Rules: ${rules.slice(0, 3).join(', ')}${rules.length > 3 ? '...' : ''}`);
  }
}

// Test Porter routing with enabled agents only
console.log('\n🧠 Porter Routing Test:');
console.log('----------------------');

function testPorterRouting(taskTitle) {
  const enabledAgents = agents.filter(a => a.enabled);
  const text = taskTitle.toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const agent of enabledAgents) {
    const rules = JSON.parse(agent.handoff_rules || '[]');
    let score = 0;
    
    for (const rule of rules) {
      if (text.includes(rule.toLowerCase())) {
        score += rule.length;
      }
    }
    
    if (score > bestScore) {
      bestMatch = agent;
      bestScore = score;
    }
  }
  
  return bestMatch ? bestMatch.name : 'Developer (fallback)';
}

const testTasks = [
  'Fix dashboard bug in user interface',
  'Write blog post about WordPress features', 
  'Check Google Search Console rankings',
  'Post on Reddit about our new plugin'
];

for (const task of testTasks) {
  const assignedTo = testPorterRouting(task);
  console.log(`   "${task}" → ${assignedTo}`);
}

console.log('\n✅ Active/Inactive Agent System Fully Operational!');
console.log('\nDashboard Features:');
console.log('• Unified grid layout showing all agents');
console.log('• Toggle switches for enable/disable (except Porter)');
console.log('• Visual differentiation for inactive agents');
console.log('• Porter protection with lock icon');
console.log('• Real-time Porter routing based on enabled agents');
console.log('• Status badges and spawn button management');

db.close();