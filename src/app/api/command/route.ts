import { NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { getCurrentUser, needsSetup } from '@/lib/auth';

export async function GET() {
  // Skip auth check if setup is needed
  if (!needsSetup()) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Connect to marketing DB (command centre)
    const dbPath = '/home/mike/apps/websites/growth-marketing/marketing.db';
    const db = existsSync(dbPath) ? new Database(dbPath) : null;

    // Get tasks from cc_tasks
    const tasks = db ? db.prepare(`
      SELECT id, title, description, priority, status, product, area, assigned_agent, created_at
      FROM cc_tasks
      WHERE status IN ('backlog', 'in_progress')
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        created_at ASC
      LIMIT 50
    `).all() : [];

    // Get recurring tasks from cron jobs file
    let recurring = [];
    try {
      const cronPaths = [
        '/root/.openclaw/cron/jobs.json',
        '/root/.clawdbot/cron/jobs.json',
      ];
      
      for (const cronPath of cronPaths) {
        if (existsSync(cronPath)) {
          const data = JSON.parse(readFileSync(cronPath, 'utf8'));
          recurring = (data.jobs || []).map((job: any) => {
            const schedule = job.schedule || {};
            const payload = job.payload || {};
            let scheduleStr = 'unknown';
            
            if (schedule.kind === 'cron') {
              scheduleStr = schedule.expr || 'unknown';
            } else if (schedule.kind === 'every') {
              const mins = Math.round((schedule.everyMs || 0) / 60000);
              scheduleStr = mins < 60 ? `Every ${mins}m` : `Every ${Math.round(mins / 60)}h`;
            } else if (schedule.kind === 'at') {
              scheduleStr = `Once at ${schedule.at}`;
            }
            
            return {
              id: job.id || job.jobId,
              name: job.name || payload.message?.substring(0, 50) || job.id || 'Unnamed',
              schedule: scheduleStr,
              enabled: job.enabled !== false,
              nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toLocaleString() : null,
              description: payload.message || payload.text || '',
              model: payload.model || null,
            };
          });
          break;
        }
      }
    } catch (err) {
      console.error('Failed to read cron config:', err);
    }

    // Get reports from overlord directory
    const reports = [];
    const reportsDir = '/home/mike/apps/websites/growth-marketing/reports/overlord';
    if (existsSync(reportsDir)) {
      const files = readdirSync(reportsDir)
        .filter(f => f.endsWith('.mdx'))
        .map(f => {
          const path = join(reportsDir, f);
          const stats = statSync(path);
          return {
            name: f.replace('.mdx', '').replace(/-/g, ' '),
            date: stats.mtime.toLocaleDateString(),
            path: `/overlord/reports/${f.replace('.mdx', '')}`,
            size: stats.size,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20);
      reports.push(...files);
    }

    // Define agent team
    const agents = [
      {
        id: 'clawd',
        name: 'Clawd',
        role: 'AI Cofounder - Strategy, execution, and autonomous work',
        skills: ['WordPress', 'React', 'Next.js', 'SEO', 'Content', 'Business Strategy'],
        active: true,
      },
      {
        id: 'porter',
        name: 'Porter',
        role: 'Work Queue Manager - Assigns and coordinates tasks',
        skills: ['Task Management', 'Prioritization', 'Agent Coordination'],
        active: false,
      },
      {
        id: 'content-writer',
        name: 'Content Writer',
        role: 'Blog posts, guides, and SEO content',
        skills: ['SEO Writing', 'Keyword Research', 'Content Strategy'],
        active: false,
      },
      {
        id: 'developer',
        name: 'Developer',
        role: 'Code features, fix bugs, deploy updates',
        skills: ['React', 'PHP', 'WordPress', 'Database', 'Git'],
        active: false,
      },
      {
        id: 'analyst',
        name: 'Analyst',
        role: 'Data analysis, reporting, insights',
        skills: ['GA4', 'GSC', 'Data Analysis', 'SQL', 'Reporting'],
        active: false,
      },
    ];

    return NextResponse.json({
      tasks,
      recurring,
      reports,
      agents,
    });
  } catch (error) {
    console.error('Command API error:', error);
    return NextResponse.json({ error: 'Failed to load command data' }, { status: 500 });
  }
}
