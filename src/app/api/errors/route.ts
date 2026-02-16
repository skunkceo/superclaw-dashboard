import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getCurrentUser } from '@/lib/auth';

function getSessionsDir(): string {
  const paths = [
    '/root/.openclaw/agents/main/sessions',
    '/root/.clawdbot/agents/main/sessions',
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return paths[0];
}

interface ErrorEntry {
  sessionId: string;
  sessionKey: string;
  timestamp: string;
  tool: string;
  error: string;
  errorType: string;
  canSelfHeal: boolean;
  selfHealAction?: string;
}

function classifyError(tool: string, error: string): { errorType: string; canSelfHeal: boolean; selfHealAction?: string } {
  // Missing file errors
  if (error.includes('ENOENT') && error.includes('memory/')) {
    const match = error.match(/memory\/(\d{4}-\d{2}-\d{2})\.md/);
    return {
      errorType: 'missing_memory_file',
      canSelfHeal: true,
      selfHealAction: match ? `create memory/${match[1]}.md` : undefined,
    };
  }
  
  // Missing table errors (SQLite)
  if (error.includes('no such table:')) {
    const match = error.match(/no such table: (\w+)/);
    return {
      errorType: 'missing_database_table',
      canSelfHeal: false, // Requires schema knowledge
      selfHealAction: match ? `needs manual schema fix for table: ${match[1]}` : undefined,
    };
  }
  
  // Directory operations on files
  if (error.includes('EISDIR') || error.includes('ENOTDIR')) {
    return {
      errorType: 'path_type_mismatch',
      canSelfHeal: false,
    };
  }
  
  // Permission errors
  if (error.includes('EACCES') || error.includes('Permission denied')) {
    return {
      errorType: 'permission_error',
      canSelfHeal: false,
    };
  }
  
  return { errorType: 'unknown', canSelfHeal: false };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const hoursBack = parseInt(url.searchParams.get('hours') || '24', 10);

  const sessionsDir = getSessionsDir();
  if (!existsSync(sessionsDir)) {
    return NextResponse.json({ errors: [] });
  }

  const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
  const errors: ErrorEntry[] = [];
  const files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));

  // Load sessions.json for session keys
  const sessionsJson: Record<string, any> = {};
  try {
    const sJson = JSON.parse(readFileSync(join(sessionsDir, 'sessions.json'), 'utf8'));
    Object.assign(sessionsJson, sJson);
  } catch {}

  for (const file of files) {
    const filePath = join(sessionsDir, file);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n').filter(l => l.trim());
    let sessionId = '';
    let sessionKey = '';

    for (const line of lines) {
      let entry: any;
      try { entry = JSON.parse(line); } catch { continue; }

      // Track session ID from metadata if available
      if (!sessionId && entry.message?.metadata?.sessionId) {
        sessionId = entry.message.metadata.sessionId;
      }

      // Look for tool result errors
      if (entry.type === 'message' && entry.message?.role === 'toolResult' && entry.message?.details?.status === 'error') {
        const timestamp = new Date(entry.timestamp || entry.message.timestamp).getTime();
        if (timestamp < cutoffTime) continue;

        // Find session key from sessions.json
        if (!sessionKey && sessionId) {
          for (const [key, val] of Object.entries(sessionsJson)) {
            if ((val as any).sessionId === sessionId) {
              sessionKey = key;
              break;
            }
          }
        }

        const tool = entry.message.details.tool || entry.message.toolName || 'unknown';
        const error = entry.message.details.error || '';
        const { errorType, canSelfHeal, selfHealAction } = classifyError(tool, error);

        errors.push({
          sessionId: sessionId || file.replace('.jsonl', ''),
          sessionKey: sessionKey || 'unknown',
          timestamp: entry.timestamp || entry.message.timestamp || new Date().toISOString(),
          tool,
          error,
          errorType,
          canSelfHeal,
          selfHealAction,
        });

        if (errors.length >= limit) break;
      }
    }

    if (errors.length >= limit) break;
  }

  // Sort by timestamp descending
  errors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group by error type for summary
  const summary: Record<string, number> = {};
  const healable: number = errors.filter(e => e.canSelfHeal).length;
  
  for (const err of errors) {
    summary[err.errorType] = (summary[err.errorType] || 0) + 1;
  }

  return NextResponse.json({
    total: errors.length,
    healable,
    summary,
    errors: errors.slice(0, limit),
  });
}

// POST endpoint for self-healing
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, data } = body;

  const results: Array<{ action: string; success: boolean; error?: string }> = [];

  if (action === 'heal_all') {
    // Get all healable errors
    const errorsResp = await GET(request);
    const errorsData = await errorsResp.json();
    
    const healableErrors = errorsData.errors.filter((e: ErrorEntry) => e.canSelfHeal);
    
    for (const err of healableErrors) {
      if (err.errorType === 'missing_memory_file' && err.selfHealAction) {
        const match = err.selfHealAction.match(/create (memory\/\d{4}-\d{2}-\d{2}\.md)/);
        if (match) {
          const filePath = match[1];
          const fullPath = join('/root/clawd', filePath);
          
          try {
            // Ensure directory exists
            mkdirSync(dirname(fullPath), { recursive: true });
            
            // Create file with header
            const date = filePath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
            writeFileSync(fullPath, `# ${date}\n\n`);
            
            results.push({ action: `create ${filePath}`, success: true });
          } catch (e: any) {
            results.push({ action: `create ${filePath}`, success: false, error: e.message });
          }
        }
      }
    }
  } else if (action === 'heal_one') {
    // Heal a specific error
    const { errorType, selfHealAction } = data;
    
    if (errorType === 'missing_memory_file' && selfHealAction) {
      const match = selfHealAction.match(/create (memory\/\d{4}-\d{2}-\d{2}\.md)/);
      if (match) {
        const filePath = match[1];
        const fullPath = join('/root/clawd', filePath);
        
        try {
          mkdirSync(dirname(fullPath), { recursive: true });
          const date = filePath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          writeFileSync(fullPath, `# ${date}\n\n`);
          results.push({ action: `create ${filePath}`, success: true });
        } catch (e: any) {
          results.push({ action: `create ${filePath}`, success: false, error: e.message });
        }
      }
    }
  }

  return NextResponse.json({ results });
}
