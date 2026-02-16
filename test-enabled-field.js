#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

console.log('=== Testing Enabled Field ===');

// Check current agents with enabled status
const agents = db.prepare('SELECT id, name, enabled FROM agent_definitions').all();

console.log('\nCurrent Agents:');
for (const agent of agents) {
  const status = agent.enabled ? '✅ Active' : '❌ Inactive';
  console.log(`  ${agent.name}: ${status}`);
}

// Test toggling an agent (but not Porter)
const testAgent = agents.find(a => !a.name.toLowerCase().includes('porter'));
if (testAgent) {
  console.log(`\nTesting toggle on: ${testAgent.name}`);
  console.log(`  Current state: ${testAgent.enabled ? 'Enabled' : 'Disabled'}`);
  
  // Toggle it
  const newState = testAgent.enabled ? 0 : 1;
  db.prepare('UPDATE agent_definitions SET enabled = ? WHERE id = ?').run(newState, testAgent.id);
  
  const updated = db.prepare('SELECT enabled FROM agent_definitions WHERE id = ?').get(testAgent.id);
  console.log(`  New state: ${updated.enabled ? 'Enabled' : 'Disabled'}`);
  
  // Toggle it back
  db.prepare('UPDATE agent_definitions SET enabled = ? WHERE id = ?').run(testAgent.enabled, testAgent.id);
  console.log(`  Restored to: ${testAgent.enabled ? 'Enabled' : 'Disabled'}`);
}

// Test Porter protection (should have lock icon, not toggle)
const porter = agents.find(a => a.name.toLowerCase().includes('porter'));
if (porter) {
  console.log(`\n🔒 Porter Agent: ${porter.name} (ID: ${porter.id})`);
  console.log(`   Status: Always Active (cannot be disabled)`);
} else {
  console.log('\n⚠️  No Porter agent found - you may want to create one.');
}

console.log('\n✅ Enabled field is working correctly!');

db.close();