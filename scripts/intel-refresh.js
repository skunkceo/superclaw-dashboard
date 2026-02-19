#!/usr/bin/env node
/**
 * intel-refresh.js
 * Standalone intel refresh + suggestion generation script.
 * Called by Clawd's cron jobs — no HTTP auth required.
 *
 * Usage: node scripts/intel-refresh.js
 * Env:   BRAVE_SEARCH_API_KEY (falls back to reading .env.local)
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { randomUUID } = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const dataDir = process.env.SUPERCLAW_DATA_DIR || '/home/mike/.superclaw';
const db = new Database(path.join(dataDir, 'superclaw.db'));

// Load API key from env or .env.local
let BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
if (!BRAVE_KEY) {
  const envFile = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^BRAVE_SEARCH_API_KEY=(.+)$/);
      if (m) { BRAVE_KEY = m[1].trim(); break; }
    }
  }
}

if (!BRAVE_KEY) {
  console.error('ERROR: BRAVE_SEARCH_API_KEY not found. Set it in .env.local or environment.');
  process.exit(1);
}

// ─── Search queries ───────────────────────────────────────────────────────────

const QUERIES = [
  { query: 'WordPress CRM plugin news 2026', category: 'market' },
  { query: 'WordPress forms plugin update release 2026', category: 'market' },
  { query: 'WPForms update new features 2026', category: 'competitor' },
  { query: 'Gravity Forms announcement 2026', category: 'competitor' },
  { query: 'FluentCRM update changelog 2026', category: 'competitor' },
  { query: 'HubSpot WordPress plugin update', category: 'competitor' },
  { query: 'best WordPress CRM plugin comparison', category: 'seo' },
  { query: 'best WordPress contact form plugin', category: 'seo' },
  { query: 'WordPress plugin business growth strategy', category: 'opportunity' },
  { query: 'small business WordPress plugin alternatives SaaS', category: 'opportunity' },
  { query: 'WordPress developer community news this week', category: 'wordpress' },
];

// ─── Brave search ─────────────────────────────────────────────────────────────

async function searchBrave(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&freshness=pm`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.web?.results || [];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function getExistingTitles() {
  const rows = db.prepare('SELECT title FROM intel_items').all();
  return new Set(rows.map(r => r.title.toLowerCase().slice(0, 80)));
}

function scoreRelevance(title, summary) {
  const text = (title + ' ' + summary).toLowerCase();
  let score = 40;
  const highValue = ['wordpress', 'crm', 'forms', 'plugin', 'small business'];
  const competitors = ['wpforms', 'gravity forms', 'fluentcrm', 'hubspot', 'ninja forms', 'fluent forms'];
  const updates = ['update', 'new', 'launch', 'release'];
  for (const k of highValue) if (text.includes(k)) score += 8;
  for (const k of competitors) if (text.includes(k)) score += 10;
  for (const k of updates) if (text.includes(k)) score += 4;
  return Math.min(score, 100);
}

function insertIntel(category, title, summary, url, source, relevanceScore) {
  db.prepare(`
    INSERT INTO intel_items (id, category, title, summary, url, source, relevance_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), category, title.slice(0, 200), summary.slice(0, 500), url || null, source, relevanceScore);
}

// ─── Suggestion generation ────────────────────────────────────────────────────

const STANDING_SUGGESTIONS = [
  { title: 'Write a SkunkForms vs WPForms comparison post', why: 'Comparison content drives high-intent traffic. Users searching "SkunkForms vs WPForms" are ready to choose — we should own that content.', effort: 'medium', impact: 'high', impact_score: 80, category: 'content', priority: 2 },
  { title: 'Update SkunkCRM homepage H1 and meta description for CRM keywords', why: 'Current homepage is thin on CRM keyword signals. A targeted H1 and meta could improve ranking for "WordPress CRM plugin" searches.', effort: 'low', impact: 'high', impact_score: 75, category: 'seo', priority: 2 },
  { title: 'Write Reddit community post about WordPress form builder frustrations', why: 'Reddit is our highest potential organic channel. A thoughtful post drives traffic and builds trust.', effort: 'low', impact: 'high', impact_score: 70, category: 'marketing', priority: 2 },
  { title: 'Generate 10 new blog post ideas for skunkcrm.com/resources/', why: 'Content velocity is our main SEO lever. The resources section needs consistent new posts to build topical authority.', effort: 'low', impact: 'medium', impact_score: 60, category: 'content', priority: 3 },
  { title: 'Run PageSpeed audit on SkunkForms and SkunkCRM landing pages', why: 'Core Web Vitals affect Google rankings. Quick wins here could boost SEO performance.', effort: 'low', impact: 'medium', impact_score: 55, category: 'seo', priority: 3 },
  { title: 'Research Skunk Global product pricing vs competitors', why: 'At $50/mo per product, we are significantly above market. Understanding competitor pricing is critical for conversion rate.', effort: 'low', impact: 'high', impact_score: 80, category: 'research', priority: 2 },
  { title: 'Write "WordPress CRM plugin: complete guide" long-form post', why: 'High-volume search term with commercial intent. A comprehensive guide could rank and drive CRM plugin downloads.', effort: 'high', impact: 'high', impact_score: 80, category: 'content', priority: 2 },
  { title: 'Audit SkunkForms free plugin features vs WPForms free tier', why: 'Knowing the gap informs content and roadmap decisions.', effort: 'medium', impact: 'medium', impact_score: 60, category: 'product', priority: 3 },
];

function seedStandingSuggestions() {
  let added = 0;
  for (const s of STANDING_SUGGESTIONS) {
    const existing = db.prepare("SELECT id FROM suggestions WHERE title = ? AND status NOT IN ('dismissed','completed')").get(s.title);
    if (existing) continue;
    db.prepare(`INSERT INTO suggestions (id, title, why, effort, impact, impact_score, category, source_intel_ids, status, priority, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', 'pending', ?, NULL, ?)`).run(
      randomUUID(), s.title, s.why, s.effort, s.impact, s.impact_score, s.category, s.priority, Date.now()
    );
    added++;
  }
  return added;
}

function generateFromIntel(newItems) {
  let added = 0;
  const existing = db.prepare("SELECT title, status FROM suggestions").all();
  const existingTitles = new Set(existing.filter(s => !['dismissed','completed'].includes(s.status)).map(s => s.title.toLowerCase().slice(0, 60)));

  for (const item of newItems) {
    let title, why, effort, impact, impact_score, category, priority;

    if (item.category === 'competitor') {
      title = `Research: ${item.title.slice(0, 55)}`;
      why = `Competitor move: "${item.summary.slice(0, 120)}". Worth understanding the implications for SkunkForms/SkunkCRM positioning.`;
      effort = 'low'; impact = 'medium'; impact_score = 60; category = 'research'; priority = 2;
    } else if (item.category === 'seo' && item.relevance_score >= 50) {
      title = `SEO content: Write about "${item.title.slice(0, 45)}"`;
      why = `High-relevance SEO signal: "${item.summary.slice(0, 120)}". Creating targeted content here could capture search traffic.`;
      effort = 'medium'; impact = 'high'; impact_score = 75; category = 'content'; priority = 2;
    } else if (item.category === 'opportunity' && item.relevance_score >= 55) {
      title = `Opportunity: ${item.title.slice(0, 55)}`;
      why = `Market opportunity: "${item.summary.slice(0, 120)}". Could shape product positioning or content strategy.`;
      effort = 'low'; impact = 'medium'; impact_score = 65; category = 'marketing'; priority = 3;
    } else {
      continue;
    }

    if (existingTitles.has(title.toLowerCase().slice(0, 60))) continue;

    db.prepare(`INSERT INTO suggestions (id, title, why, effort, impact, impact_score, category, source_intel_ids, status, priority, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`).run(
      randomUUID(), title, why, effort, impact, impact_score, category, JSON.stringify([item.id]), priority, Date.now()
    );
    existingTitles.add(title.toLowerCase().slice(0, 60));
    added++;
  }
  return added;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const existingTitles = getExistingTitles();
  const newItems = [];
  let queriesRun = 0;
  let skipped = 0;

  for (const { query, category } of QUERIES) {
    try {
      const results = await searchBrave(query);
      queriesRun++;

      for (const r of results) {
        if (!r.title || !r.description) { skipped++; continue; }
        const norm = r.title.toLowerCase().slice(0, 80);
        if (existingTitles.has(norm)) { skipped++; continue; }

        const score = scoreRelevance(r.title, r.description);
        const id = randomUUID();
        insertIntel(category, r.title, r.description, r.url, 'brave', score);
        existingTitles.add(norm);
        newItems.push({ id, category, title: r.title, summary: r.description, relevance_score: score });
      }

      await sleep(1100); // respect 1 req/sec rate limit
    } catch (err) {
      console.error(`Query "${query}" failed: ${err.message}`);
    }
  }

  const standingAdded = seedStandingSuggestions();
  const intelSugAdded = generateFromIntel(newItems);

  // Update last refresh timestamp
  db.prepare("INSERT OR REPLACE INTO proactivity_settings (key, value, updated_at) VALUES ('last_intel_refresh', ?, ?)")
    .run(Date.now().toString(), Date.now());

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const result = {
    success: true,
    queriesRun,
    newIntelItems: newItems.length,
    skipped,
    suggestionsFromIntel: intelSugAdded,
    standingSuggestions: standingAdded,
    elapsedSeconds: elapsed,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
