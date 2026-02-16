#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');

console.log('Using database:', dbPath);

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

console.log('Migrating handoff rules for existing agents...');

try {
  // Check if handoff_rules column exists by examining schema
  const tables = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agent_definitions'").get();
  console.log('Table schema:', tables.sql);
  
  if (!tables.sql.includes('handoff_rules')) {
    console.log('Adding handoff_rules column...');
    db.exec(`ALTER TABLE agent_definitions ADD COLUMN handoff_rules TEXT DEFAULT '[]'`);
  }

  let updated = 0;
  for (const [agentId, rules] of Object.entries(agentRules)) {
    const stmt = db.prepare('UPDATE agent_definitions SET handoff_rules = ? WHERE id = ?');
    const result = stmt.run(JSON.stringify(rules), agentId);
    
    if (result.changes > 0) {
      console.log(`  ✓ Updated ${agentId} with ${rules.length} handoff rules`);
      updated++;
    } else {
      console.log(`  - Skipped ${agentId} (not found)`);
    }
  }

  console.log(`\nDone! Updated ${updated} agents.`);

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

} catch (error) {
  console.error('Migration error:', error);
} finally {
  db.close();
}