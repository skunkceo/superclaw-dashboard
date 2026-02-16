#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
const dbPath = join(dataDir, 'superclaw.db');

console.log('Using database:', dbPath);

const db = new Database(dbPath);

// Handoff rules by agent name
const agentRulesByName = {
  'SEO Agent': [
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
  'Developer Agent': [
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
  'Marketing Agent': [
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
  'Content Agent': [
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
  ],
  // Handle the existing random agents too
  'SEO Analyst': [
    'GSC',
    'Google Search Console', 
    'search rankings',
    'keywords',
    'SEO',
    'SERP',
    'organic traffic'
  ],
  'Developer': [
    'code',
    'build',
    'deploy', 
    'dashboard',
    'bug',
    'error',
    'programming',
    'development',
    'infrastructure',
    'API'
  ],
  'Marketing Strategist': [
    'social media',
    'Twitter',
    'outreach',
    'growth',
    'marketing campaign',
    'engagement',
    'promotion'
  ],
  'Content Writer': [
    'blog',
    'post',
    'docs',
    'write',
    'content',
    'writing',
    'documentation',
    'articles'
  ]
};

console.log('Migrating handoff rules for existing agents...');

try {
  let updated = 0;
  
  // Get all agents
  const agents = db.prepare('SELECT id, name FROM agent_definitions').all();
  console.log(`Found ${agents.length} agents in database.`);
  
  for (const agent of agents) {
    const rules = agentRulesByName[agent.name];
    if (rules) {
      const stmt = db.prepare('UPDATE agent_definitions SET handoff_rules = ? WHERE id = ?');
      const result = stmt.run(JSON.stringify(rules), agent.id);
      
      if (result.changes > 0) {
        console.log(`  ✓ Updated "${agent.name}" with ${rules.length} handoff rules`);
        updated++;
      }
    } else {
      console.log(`  - No rules defined for "${agent.name}"`);
    }
  }

  console.log(`\nDone! Updated ${updated} agents.`);

  // Show the current rules for verification
  console.log('\n=== Current Handoff Rules ===');
  const updatedAgents = db.prepare('SELECT id, name, handoff_rules FROM agent_definitions').all();

  for (const agent of updatedAgents) {
    const rules = JSON.parse(agent.handoff_rules || '[]');
    console.log(`\n${agent.name}:`);
    if (rules.length === 0) {
      console.log('  (no rules defined)');
    } else {
      rules.slice(0, 5).forEach(rule => console.log(`  - ${rule}`));
      if (rules.length > 5) {
        console.log(`  ... and ${rules.length - 5} more`);
      }
    }
  }

} catch (error) {
  console.error('Migration error:', error);
} finally {
  db.close();
}