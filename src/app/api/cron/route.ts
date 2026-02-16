import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

const slackChannels: Record<string, string> = {
  'c0abz068w22': '#dailies',
  'c0ac4jz0m44': '#marketing',
  'c0acv8y8ahw': '#dev',
  'c0abkhh98vd': '#product',
  'c0ac11g4n4a': '#support',
  'c0ac06rawg2': '#social',
  'c0advjb9eta': '#projects',
  'c0acbtvcway': '#progress',
  'c0afe1stjsv': '#superclaw',
};

function formatSchedule(schedule: any): string {
  if (typeof schedule === 'string') return schedule;
  if (!schedule) return 'unknown';
  if (schedule.kind === 'cron') return schedule.expr || 'unknown';
  if (schedule.kind === 'every') {
    const mins = Math.round((schedule.everyMs || 0) / 60000);
    return mins < 60 ? `Every ${mins}m` : `Every ${Math.round(mins / 60)}h`;
  }
  if (schedule.kind === 'at') return `Once at ${schedule.at}`;
  return JSON.stringify(schedule);
}

function mapJob(job: any) {
  const schedule = job.schedule || {};
  const payload = job.payload || {};
  const delivery = job.delivery || {};
  const state = job.state || {};
  const channelName = slackChannels[(delivery.channel || '').toLowerCase()] || delivery.channel || null;

  return {
    id: job.id || job.jobId,
    name: job.name || payload.message?.substring(0, 50) || job.id || 'Unnamed',
    schedule: formatSchedule(schedule),
    timezone: schedule.tz || null,
    description: payload.message || '',
    model: (payload.model || 'unknown').replace('claude-', '').replace('-20241022', '').replace('-20250514', ''),
    channel: channelName,
    enabled: job.enabled !== false,
    nextRun: state.nextRunAtMs ? new Date(state.nextRunAtMs).toISOString() : null,
    sessionTarget: job.sessionTarget || 'isolated',
  };
}

function readJobsFromFile(): any[] {
  const cronPaths = [
    '/root/.openclaw/cron/jobs.json',
    '/root/.clawdbot/cron/jobs.json',
  ];

  for (const cronPath of cronPaths) {
    if (existsSync(cronPath)) {
      try {
        const data = JSON.parse(readFileSync(cronPath, 'utf8'));
        return (data.jobs || []).map(mapJob);
      } catch { continue; }
    }
  }
  return [];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read directly from file — gateway doesn't expose a /cron REST endpoint
  const jobs = readJobsFromFile();
  return NextResponse.json({ jobs });
}
