import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllTasks } from '@/lib/db';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

// Command Centre database path
const ccDbPath = '/home/mike/apps/websites/growth-marketing/marketing.db';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  assigned_agent: string | null;
  what_doing: string | null;
  created_at: number;
  completed_at: number | null;
  session_id: string | null;
  source: 'chat' | 'backlog' | 'cron';
  priority?: string;
  area?: string;
}

// Porter routing logic for Command Centre tasks
function assignAgentByArea(area?: string, title?: string): string {
  if (!area && !title) return 'developer';
  
  const text = `${area || ''} ${title || ''}`.toLowerCase();
  
  // SEO/Marketing areas
  if (text.includes('seo') || text.includes('marketing') || text.includes('growth') || text.includes('content')) {
    if (text.includes('seo') || text.includes('ranking') || text.includes('gsc')) return 'seo';
    if (text.includes('reddit') || text.includes('social') || text.includes('outreach')) return 'marketing';
    if (text.includes('content') || text.includes('blog') || text.includes('writing')) return 'content';
  }
  
  // Development areas
  if (area === 'dev' || area === 'infrastructure' || text.includes('code') || text.includes('build')) {
    return 'developer';
  }
  
  // Default assignment based on keywords
  if (text.includes('seo') || text.includes('gsc') || text.includes('ranking')) return 'seo';
  if (text.includes('reddit') || text.includes('social') || text.includes('marketing')) return 'marketing';
  if (text.includes('blog') || text.includes('content') || text.includes('writing')) return 'content';
  
  return 'developer'; // Default
}

export async function GET() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTasks: Task[] = [];

    // 1. Get SuperClaw tasks (ad-hoc Slack tasks)
    const superclawTasks = getAllTasks();
    for (const task of superclawTasks) {
      allTasks.push({
        id: `sc-${task.id}`,
        title: task.title,
        status: task.status,
        assigned_agent: task.assigned_agent,
        what_doing: task.what_doing,
        created_at: task.created_at,
        completed_at: task.completed_at,
        session_id: task.session_id,
        source: 'chat',
      });
    }

    // 2. Get Command Centre tasks (backlog/in_progress)
    if (existsSync(ccDbPath)) {
      try {
        const ccDb = new Database(ccDbPath, { readonly: true });
        
        const ccTasks = ccDb.prepare(`
          SELECT id, title, description, status, priority, area, created_at, updated_at
          FROM cc_tasks 
          WHERE status IN ('backlog', 'in_progress')
          ORDER BY created_at DESC
          LIMIT 20
        `).all() as Array<{
          id: number;
          title: string;
          description: string;
          status: string;
          priority: string;
          area: string;
          created_at: string;
          updated_at: string;
        }>;

        for (const ccTask of ccTasks) {
          const assignedAgent = assignAgentByArea(ccTask.area, ccTask.title);
          
          allTasks.push({
            id: `cc-${ccTask.id}`,
            title: ccTask.title,
            status: ccTask.status === 'in_progress' ? 'active' : 'pending',
            assigned_agent: assignedAgent,
            what_doing: ccTask.status === 'in_progress' ? `Working on ${ccTask.area} task` : null,
            created_at: new Date(ccTask.created_at).getTime(),
            completed_at: null,
            session_id: null,
            source: 'backlog',
            priority: ccTask.priority,
            area: ccTask.area,
          });
        }

        ccDb.close();
      } catch (error) {
        console.error('Error reading Command Centre tasks:', error);
      }
    }

    // 3. Get scheduled work (cron jobs) - mock for now
    // TODO: Integrate with actual cron job status when available
    const cronTasks = [
      {
        id: 'cron-dailies',
        title: 'Daily Morning Briefing',
        status: 'active' as const,
        assigned_agent: 'marketing',
        what_doing: 'Preparing daily briefing at 7am UK',
        created_at: Date.now() - (24 * 60 * 60 * 1000), // 1 day ago
        completed_at: null,
        session_id: null,
        source: 'cron' as const,
        area: 'automation',
      },
      {
        id: 'cron-heartbeat',
        title: 'Heartbeat Health Checks',
        status: 'pending' as const,
        assigned_agent: 'developer',
        what_doing: null,
        created_at: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
        completed_at: null,
        session_id: null,
        source: 'cron' as const,
        area: 'monitoring',
      },
    ];

    allTasks.push(...cronTasks);

    // Sort by created_at descending
    allTasks.sort((a, b) => b.created_at - a.created_at);

    // Calculate stats
    const active = allTasks.filter(t => t.status === 'active').length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;

    return NextResponse.json({
      tasks: {
        active,
        pending,
        completed,
        allTasks,
      },
    });
  } catch (error) {
    console.error('Dashboard tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard tasks' }, { status: 500 });
  }
}