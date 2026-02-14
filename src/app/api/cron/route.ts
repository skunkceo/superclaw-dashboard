import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';

function getGatewayConfig() {
  const configPaths = [
    '/root/.clawdbot/clawdbot.json',
    join(process.env.HOME || '', '.clawdbot/clawdbot.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const config = JSON.parse(readFileSync(path, 'utf8'));
        return {
          port: config?.gateway?.port || 18789,
          token: config?.gateway?.auth?.token || '',
        };
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const gatewayConfig = getGatewayConfig();
    if (!gatewayConfig) {
      return NextResponse.json({ jobs: [], error: 'Gateway not configured' });
    }

    const { port, token } = gatewayConfig;

    // Try to get cron jobs from gateway API
    try {
      const response = await fetch(`http://127.0.0.1:${port}/cron`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = (data.jobs || []).map((job: Record<string, unknown>) => ({
          id: job.id || job.jobId,
          schedule: job.schedule,
          text: job.text || job.id,
          enabled: job.enabled !== false,
          nextRun: job.nextRun,
          channel: job.channel,
        }));
        return NextResponse.json({ jobs });
      }
    } catch {
      // Gateway API not available, try reading config file directly
    }

    // Fallback: read from config file
    const cronPaths = [
      '/root/.clawdbot/cron/jobs.json',
      join(process.env.HOME || '', '.clawdbot/cron/jobs.json'),
    ];

    for (const cronPath of cronPaths) {
      if (existsSync(cronPath)) {
        try {
          const cronData = JSON.parse(readFileSync(cronPath, 'utf8'));
          const jobs = (cronData.jobs || []).map((job: Record<string, unknown>) => ({
            id: job.id || job.jobId,
            schedule: job.schedule,
            text: job.text || job.id,
            enabled: job.enabled !== false,
            channel: job.channel,
          }));
          return NextResponse.json({ jobs });
        } catch {
          continue;
        }
      }
    }

    return NextResponse.json({ jobs: [] });
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Failed to fetch cron jobs' });
  }
}
