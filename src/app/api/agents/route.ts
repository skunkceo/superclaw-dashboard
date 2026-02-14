import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';
import Database from 'better-sqlite3';

const MAX_CONCURRENT_AGENTS = 3;

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

function getMarketingDb() {
  const dbPath = '/home/mike/apps/websites/growth-marketing/marketing.db';
  if (existsSync(dbPath)) {
    return new Database(dbPath, { readonly: true });
  }
  return null;
}

interface MainAgentStatus {
  status: 'idle' | 'processing' | 'thinking';
  activity: string;
  lastActive: number;
  model?: string;
  sessionTokens?: number;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get main agent status from gateway
    let mainAgent: MainAgentStatus = {
      status: 'idle',
      activity: 'Waiting for input',
      lastActive: Date.now(),
    };

    const gatewayConfig = getGatewayConfig();
    if (gatewayConfig) {
      try {
        // Get main session info
        const sessionsResponse = await fetch(
          `http://127.0.0.1:${gatewayConfig.port}/sessions?limit=10&messageLimit=1`,
          {
            headers: {
              'Authorization': `Bearer ${gatewayConfig.token}`,
            },
          }
        );

        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          // Find all main agent sessions (base + threads)
          const mainSessions = sessionsData.sessions?.filter(
            (s: { key?: string }) => s.key?.startsWith('agent:main:main')
          ) || [];

          if (mainSessions.length > 0) {
            // Find the most recently active session
            const mostRecent = mainSessions.reduce((latest: { updatedAt?: number }, s: { updatedAt?: number }) => 
              (s.updatedAt || 0) > (latest.updatedAt || 0) ? s : latest
            , mainSessions[0]);

            // Get base session for total tokens
            const baseSession = mainSessions.find((s: { key?: string }) => s.key === 'agent:main:main');

            const lastActive = mostRecent.updatedAt || Date.now();
            const secondsSinceActive = (Date.now() - lastActive) / 1000;
            
            // Determine status based on recency
            let status: 'idle' | 'processing' | 'thinking' = 'idle';
            let activity = 'Waiting for input';
            
            if (secondsSinceActive < 10) {
              status = 'processing';
              activity = 'Processing request...';
            } else if (secondsSinceActive < 60) {
              status = 'thinking';
              // Try to get last message content for context
              const lastMsg = (mostRecent as { messages?: Array<{ content?: Array<{ type: string; text?: string }> }> }).messages?.[0];
              if (lastMsg?.content) {
                const textContent = lastMsg.content.find((c: { type: string }) => c.type === 'text');
                if (textContent?.text && textContent.text !== 'HEARTBEAT_OK') {
                  activity = textContent.text.slice(0, 100) + (textContent.text.length > 100 ? '...' : '');
                } else if (lastMsg.content.find((c: { type: string }) => c.type === 'toolCall')) {
                  activity = 'Running tools...';
                }
              }
            } else if (secondsSinceActive < 300) {
              activity = 'Recently active';
            }

            // Count active threads
            const activeThreads = mainSessions.filter((s: { key?: string; updatedAt?: number }) => 
              s.key !== 'agent:main:main' && 
              (Date.now() - (s.updatedAt || 0)) < 300000 // Active in last 5 min
            ).length;

            mainAgent = {
              status,
              activity: activeThreads > 0 ? `${activity} (${activeThreads} active thread${activeThreads > 1 ? 's' : ''})` : activity,
              lastActive,
              model: (mostRecent as { model?: string }).model || (baseSession as { model?: string })?.model,
              sessionTokens: (baseSession as { totalTokens?: number })?.totalTokens,
            };
          }
        }
      } catch (e) {
        console.error('Error fetching main agent status:', e);
      }
    }

    // Get queue data from marketing db
    let queueBacklog = 0;
    let queueInProgress = 0;
    let queueItems: Array<{
      id: number;
      title: string;
      priority: string;
      product?: string;
      area?: string;
      status: string;
      created_at: number;
    }> = [];

    const db = getMarketingDb();
    if (db) {
      try {
        const backlogResult = db.prepare(
          "SELECT COUNT(*) as count FROM cc_tasks WHERE status = 'backlog'"
        ).get() as { count: number };
        queueBacklog = backlogResult?.count || 0;

        const inProgressResult = db.prepare(
          "SELECT COUNT(*) as count FROM cc_tasks WHERE status = 'in_progress'"
        ).get() as { count: number };
        queueInProgress = inProgressResult?.count || 0;

        queueItems = db.prepare(`
          SELECT id, title, priority, product, area, status, created_at
          FROM cc_tasks
          WHERE status IN ('backlog', 'in_progress')
          ORDER BY 
            status DESC,
            CASE priority 
              WHEN 'critical' THEN 0 
              WHEN 'high' THEN 1 
              WHEN 'medium' THEN 2 
              WHEN 'low' THEN 3 
            END,
            created_at ASC
          LIMIT 20
        `).all() as typeof queueItems;

        db.close();
      } catch (e) {
        console.error('Error querying marketing db:', e);
        db.close();
      }
    }

    // Get active sub-agent sessions from gateway
    let activeSessions: Array<{
      sessionKey: string;
      label?: string;
      task?: string;
      model?: string;
      status: 'running' | 'completed' | 'error';
      startedAt?: string;
      lastMessage?: string;
    }> = [];

    // Reuse gatewayConfig from above
    if (gatewayConfig) {
      try {
        const response = await fetch(
          `http://127.0.0.1:${gatewayConfig.port}/sessions?kinds=spawn`,
          {
            headers: {
              'Authorization': `Bearer ${gatewayConfig.token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.sessions)) {
            activeSessions = data.sessions
              .filter((s: { status?: string }) => s.status === 'active' || s.status === 'running')
              .map((s: { 
                sessionKey?: string; 
                key?: string;
                label?: string; 
                task?: string; 
                model?: string;
                status?: string;
                startedAt?: string;
                createdAt?: string;
                lastMessage?: { text?: string };
              }) => ({
                sessionKey: s.sessionKey || s.key || 'unknown',
                label: s.label,
                task: s.task,
                model: s.model,
                status: 'running' as const,
                startedAt: s.startedAt || s.createdAt,
                lastMessage: s.lastMessage?.text,
              }));
          }
        }
      } catch (e) {
        console.error('Error fetching gateway sessions:', e);
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (queueBacklog > 0 && activeSessions.length === 0) {
      recommendations.push(`${queueBacklog} tasks waiting but no agents running. Consider spawning a sub-agent.`);
    }
    
    if (queueBacklog > 5 && activeSessions.length < MAX_CONCURRENT_AGENTS) {
      recommendations.push(`Queue is backing up (${queueBacklog} tasks). Could spawn ${MAX_CONCURRENT_AGENTS - activeSessions.length} more agents.`);
    }
    
    if (activeSessions.length >= MAX_CONCURRENT_AGENTS) {
      recommendations.push('Running at max capacity. Wait for current work to complete.');
    }
    
    if (queueBacklog === 0 && activeSessions.length === 0) {
      recommendations.push('All caught up! Add work via chat or wait for scheduled tasks.');
    }

    return NextResponse.json({
      mainAgent,
      queue: {
        backlog: queueBacklog,
        inProgress: queueInProgress,
        items: queueItems,
      },
      agents: {
        active: activeSessions.length,
        maxConcurrent: MAX_CONCURRENT_AGENTS,
        sessions: activeSessions,
      },
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching operations data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
