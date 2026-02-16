import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * Returns the installable model-router module for OpenClaw workspaces
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const moduleCode = `#!/usr/bin/env node
/**
 * SuperClaw Model Router
 * Auto-generated from SuperClaw Dashboard
 * 
 * This module routes tasks to appropriate models based on user preferences.
 * It can work in two modes:
 * 1. API mode - calls back to SuperClaw dashboard for routing decisions
 * 2. Local mode - uses synced preferences for offline routing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG_FILE = path.join(process.cwd(), 'data', 'superclaw-router.json');
const PREFS_FILE = path.join(process.cwd(), 'data', 'superclaw-model-prefs.json');

const DEFAULT_CONFIG = {
  mode: 'api', // 'api' or 'local'
  apiUrl: 'https://superclaw.skunkglobal.com',
  apiToken: null,
};

const DEFAULT_PREFS = {
  data_pulls: 'haiku',
  content: 'sonnet',
  code: 'sonnet',
  strategy: 'opus',
  research: 'sonnet',
  summaries: 'haiku',
};

const MODEL_MAP = {
  haiku: 'claude-haiku-3-5-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20250514',
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

function loadPrefs() {
  try {
    if (fs.existsSync(PREFS_FILE)) {
      return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
    }
  } catch {}
  return DEFAULT_PREFS;
}

function getPreferenceKey(taskTitle) {
  const lower = taskTitle.toLowerCase();
  
  if (/(data pull|sitemap|gsc|ga4|api call|extract|fetch)/.test(lower)) {
    return 'data_pulls';
  }
  if (/(blog|content|write|copy|doc|article|post)/.test(lower)) {
    return 'content';
  }
  if (/(code|implement|pr|debug|refactor|feature|fix|endpoint)/.test(lower)) {
    return 'code';
  }
  if (/(strategy|architect|planning|decision|design|system|complex)/.test(lower)) {
    return 'strategy';
  }
  if (/(research|competitor|seo|analysis|audit|opportunity)/.test(lower)) {
    return 'research';
  }
  if (/(summary|brief|report|status|update|overview)/.test(lower)) {
    return 'summaries';
  }
  
  return 'content';
}

function getModelLocal(taskTitle) {
  const prefs = loadPrefs();
  const prefKey = getPreferenceKey(taskTitle);
  const modelPref = prefs[prefKey] || 'sonnet';
  return MODEL_MAP[modelPref] || MODEL_MAP.sonnet;
}

async function getModelAPI(taskTitle) {
  const config = loadConfig();
  
  return new Promise((resolve, reject) => {
    const url = new URL('/api/router', config.apiUrl);
    url.searchParams.set('task', taskTitle);
    
    const options = {
      headers: config.apiToken ? { 'Authorization': \`Bearer \${config.apiToken}\` } : {},
    };
    
    https.get(url.toString(), options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.model);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function getModelForTask(taskTitle) {
  const config = loadConfig();
  
  try {
    if (config.mode === 'api' && config.apiUrl) {
      return await getModelAPI(taskTitle);
    }
  } catch (err) {
    console.error('API routing failed, falling back to local:', err.message);
  }
  
  return getModelLocal(taskTitle);
}

function explainRouting(taskTitle) {
  const prefs = loadPrefs();
  const prefKey = getPreferenceKey(taskTitle);
  const model = getModelLocal(taskTitle);
  const modelName = Object.keys(MODEL_MAP).find(k => MODEL_MAP[k] === model) || 'sonnet';
  
  return {
    task: taskTitle,
    category: prefKey,
    model,
    modelName,
    mode: loadConfig().mode,
  };
}

// CLI usage
if (require.main === module) {
  const taskTitle = process.argv[2];
  if (!taskTitle) {
    console.error('Usage: model-router.js "<task title>" [--explain]');
    process.exit(1);
  }
  
  if (process.argv[3] === '--explain') {
    console.log(JSON.stringify(explainRouting(taskTitle), null, 2));
  } else {
    getModelForTask(taskTitle).then(model => console.log(model));
  }
}

module.exports = {
  getModelForTask,
  getPreferenceKey,
  explainRouting,
  loadConfig,
  loadPrefs,
  MODEL_MAP,
};
`;

  return new Response(moduleCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Content-Disposition': 'attachment; filename="model-router.js"',
    },
  });
}
