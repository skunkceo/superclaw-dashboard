#!/usr/bin/env node

const Database = require('better-sqlite3');
const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');

// Use the same database path as the app
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Specialist agents definitions
const specialistAgents = [
  {
    id: 'seo',
    name: 'SEO Agent',
    description: 'Search engine optimization, rankings, and content strategy specialist',
    soul: 'You are an SEO expert focused on improving search rankings and organic traffic. You analyze GSC data, optimize content, research keywords, and develop content strategies that drive results.',
    model: 'claude-sonnet-4-20250514',
    skills: JSON.stringify(['seo', 'gsc', 'content-strategy', 'keyword-research']),
    tools: JSON.stringify(['web-search', 'web-fetch']),
    color: 'rgb(34, 197, 94)', // green-500
    icon: 'chart',
    system_prompt: 'Focus on SEO best practices, data-driven insights, and organic growth strategies. Always provide actionable recommendations.',
    thinking: 'medium'
  },
  {
    id: 'developer',
    name: 'Developer Agent',
    description: 'Code development, builds, deployments, and infrastructure specialist',
    soul: 'You are a skilled developer who writes clean, efficient code. You handle builds, deployments, debugging, and infrastructure tasks with precision and best practices.',
    model: 'claude-sonnet-4-20250514',
    skills: JSON.stringify(['coding', 'devops', 'debugging', 'infrastructure']),
    tools: JSON.stringify(['exec', 'read', 'write', 'edit']),
    color: 'rgb(59, 130, 246)', // blue-500
    icon: 'code',
    system_prompt: 'Write production-ready code following best practices. Consider security, performance, and maintainability in all solutions.',
    thinking: 'low'
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    description: 'Reddit, social media, outreach, and growth strategy specialist',
    soul: 'You are a growth-focused marketer who understands social dynamics and community engagement. You create authentic connections and drive meaningful engagement across platforms.',
    model: 'claude-sonnet-4-20250514',
    skills: JSON.stringify(['social-media', 'reddit', 'community-management', 'growth-hacking']),
    tools: JSON.stringify(['web-search', 'web-fetch', 'message']),
    color: 'rgb(239, 68, 68)', // red-500
    icon: 'megaphone',
    system_prompt: 'Focus on authentic engagement and community building. Avoid spammy tactics and prioritize genuine value for communities.',
    thinking: 'medium'
  },
  {
    id: 'content',
    name: 'Content Agent',
    description: 'Blog posts, documentation, and content creation specialist',
    soul: 'You are a skilled writer who creates engaging, informative content. You understand audience needs and craft compelling narratives that educate and inspire.',
    model: 'claude-sonnet-4-20250514',
    skills: JSON.stringify(['writing', 'content-creation', 'documentation', 'copywriting']),
    tools: JSON.stringify(['web-search', 'web-fetch', 'read', 'write']),
    color: 'rgb(168, 85, 247)', // purple-500
    icon: 'pencil',
    system_prompt: 'Create high-quality, engaging content that provides real value to readers. Focus on clarity, structure, and actionable insights.',
    thinking: 'low'
  }
];

// Function to check if agent exists
function agentExists(id) {
  const result = db.prepare('SELECT COUNT(*) as count FROM agent_definitions WHERE id = ?').get(id);
  return result.count > 0;
}

// Function to create agent
function createAgent(agent) {
  const stmt = db.prepare(`
    INSERT INTO agent_definitions (id, name, description, soul, model, skills, tools, color, icon, system_prompt, thinking, created_by, spawn_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    agent.id, agent.name, agent.description, agent.soul, agent.model,
    agent.skills, agent.tools, agent.color, agent.icon, agent.system_prompt,
    agent.thinking, 1, 0 // created_by = 1 (assume admin user), spawn_count = 0
  );
}

// Seed the agents
console.log('Seeding specialist agents...');
let seeded = 0;
let skipped = 0;

for (const agent of specialistAgents) {
  if (agentExists(agent.id)) {
    console.log(`  ✓ ${agent.name} already exists`);
    skipped++;
  } else {
    try {
      createAgent(agent);
      console.log(`  ✓ Created ${agent.name}`);
      seeded++;
    } catch (error) {
      console.error(`  ✗ Failed to create ${agent.name}:`, error.message);
    }
  }
}

console.log(`\nDone! Created ${seeded} agents, skipped ${skipped} existing agents.`);
db.close();