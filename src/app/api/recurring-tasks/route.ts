import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getCurrentUser } from '@/lib/auth';

const TASKS_FILE = join(process.cwd(), 'data', 'recurring-tasks.json');

interface RecurringTask {
  id: string;
  name: string;
  schedule: string;
  description: string;
  channel: string;
  model: string;
  enabled: boolean;
}

// Default recurring tasks
const DEFAULT_TASKS: RecurringTask[] = [
  {
    id: 'daily-brief',
    name: 'Daily Morning Brief',
    schedule: '0 7 * * *',
    description: 'Summary of overnight work, priorities, and business pulse',
    channel: 'dailies',
    model: 'haiku',
    enabled: true,
  },
  {
    id: 'gsc-report',
    name: 'GSC Weekly Report',
    schedule: '0 9 * * 1',
    description: 'Weekly Google Search Console performance report',
    channel: 'marketing',
    model: 'haiku',
    enabled: true,
  },
  {
    id: 'ga4-report',
    name: 'GA4 Traffic Summary',
    schedule: '0 9 * * 1',
    description: 'Weekly traffic and engagement metrics from GA4',
    channel: 'marketing',
    model: 'haiku',
    enabled: true,
  },
];

function getTasks(): RecurringTask[] {
  try {
    if (existsSync(TASKS_FILE)) {
      return JSON.parse(readFileSync(TASKS_FILE, 'utf8'));
    }
  } catch {}
  return DEFAULT_TASKS;
}

function saveTasks(tasks: RecurringTask[]) {
  const dir = dirname(TASKS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ tasks: getTasks() });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const task = await request.json();
    
    if (!task.name || !task.schedule || !task.channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tasks = getTasks();
    const newTask: RecurringTask = {
      id: task.id || `task-${Date.now()}`,
      name: task.name,
      schedule: task.schedule,
      description: task.description || '',
      channel: task.channel,
      model: task.model || 'sonnet',
      enabled: task.enabled !== false,
    };

    // Check if updating existing task
    const existingIndex = tasks.findIndex(t => t.id === newTask.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = newTask;
    } else {
      tasks.push(newTask);
    }

    saveTasks(tasks);
    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error('Error saving recurring task:', error);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'view') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
