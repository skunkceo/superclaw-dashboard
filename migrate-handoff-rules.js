#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Handoff rules for existing agents
const agentRules = {
  'seo': [
    'GSC',
    'Google Search Console', 
    'search rankings',
    'keywords',
    'analyze SEO performance',
    'check indexing status',
    'keyword research',
    'SEO',
    'SERP',
    'organic traffic',
    'search optimization'
  ],
  'developer': [
    'code',
    'build',
    'deploy', 
    'dashboard',
    'bug',
    'error',
    'fix the dashboard',
    'build a new feature',
    'update the API',
    'programming',
    'development',
    'infrastructure',
    'API'
  ],
  'marketing': [
    'social media',
    'Twitter',
    'outreach',
    'growth',
    'analyze competitors',
    'content strategy',
    'marketing campaign',
    'engagement',
    'promotion',
    'community'
  ],
  'content': [
    'blog',
    'post',
    'docs',
    'write',
    'content',
    'writing',
    'documentation',
    'guides',
    'articles',
    'copywriting',
    'editing'
  ]
};

// Function to update agent handoff rules
function updateAgentRules(agentId, rules) {
  const stmt = db.prepare(`
    UPDATE agent_definitions 
    SET handoff_rules = ? 
    WHERE id = ?
  `);
  
  const result = stmt.run(JSON.stringify(rules), agentId);
  return result.changes > 0;
}

// Migrate all agents
console.log('Migrating handoff rules for existing agents...');
let updated = 0;
let skipped = 0;

for (const [agentId, rules] of Object.entries(agentRules)) {
  if (updateAgentRules(agentId, rules)) {
    console.log(`  ✓ Updated ${agentId} with ${rules.length} handoff rules`);
    updated++;
  } else {
    console.log(`  - Skipped ${agentId} (not found)`);
    skipped++;
  }
}

console.log(`\nDone! Updated ${updated} agents, skipped ${skipped} agents.`);

// Show the current rules for verification
console.log('\n=== Current Handoff Rules ===');
const agents = db.prepare('SELECT id, name, handoff_rules FROM agent_definitions').all();

for (const agent of agents) {
  const rules = JSON.parse(agent.handoff_rules || '[]');
  console.log(`\n${agent.name} (${agent.id}):`);
  if (rules.length === 0) {
    console.log('  (no rules defined)');
  } else {
    rules.forEach(rule => console.log(`  - ${rule}`));
  }
}

db.close();