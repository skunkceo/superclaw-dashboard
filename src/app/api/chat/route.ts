import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';
import Database from 'better-sqlite3';

// Read OpenClaw configuration
function getGatewayConfig() {
  const configPaths = [
    '/root/.openclaw/openclaw.json',
    '/root/.clawdbot/clawdbot.json',
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

// Get or create chat database
function getChatDb() {
  const dbPath = '/root/.superclaw/chat.db';
  const dbDir = '/root/.superclaw';
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, timestamp);
  `);
  
  return db;
}

// POST - Send a message
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create session
    const db = getChatDb();
    const now = Date.now();
    const actualSessionId = sessionId || `chat-${now}`;
    
    // Ensure session exists
    const existingSession = db.prepare('SELECT id FROM chat_sessions WHERE id = ?').get(actualSessionId);
    if (!existingSession) {
      db.prepare(`
        INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(actualSessionId, user.email, message.substring(0, 50), now, now);
    } else {
      db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(now, actualSessionId);
    }
    
    // Save user message
    db.prepare(`
      INSERT INTO chat_messages (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(actualSessionId, 'user', message, now);
    
    db.close();

    // Send to OpenClaw gateway via sessions_send
    const gatewayConfig = getGatewayConfig();
    if (!gatewayConfig) {
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
    }

    const { port, token } = gatewayConfig;
    
    // Use the tool invoke endpoint to call sessions_send
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/tool/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'sessions_send',
          parameters: {
            sessionKey: 'agent:main:main',
            message: message,
            timeoutSeconds: 55,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Gateway error:', response.status, errorText);
        return NextResponse.json({ 
          error: `Gateway error: ${response.status}`,
          details: errorText,
        }, { status: 500 });
      }

      const data = await response.json();
      
      // Extract response content
      let assistantMessage = '';
      if (data.result?.content) {
        assistantMessage = data.result.content;
      } else if (data.content) {
        assistantMessage = data.content;
      } else if (typeof data.result === 'string') {
        assistantMessage = data.result;
      } else {
        assistantMessage = 'No response received';
      }

      // Save assistant response
      const db2 = getChatDb();
      db2.prepare(`
        INSERT INTO chat_messages (session_id, role, content, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(actualSessionId, 'assistant', assistantMessage, Date.now());
      db2.close();

      return NextResponse.json({
        message: assistantMessage,
        sessionId: actualSessionId,
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
      }

      console.error('Gateway request failed:', error);
      return NextResponse.json({ 
        error: 'Failed to communicate with gateway',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET - Retrieve chat history
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const db = getChatDb();
    
    if (sessionId) {
      // Get messages for specific session
      const messages = db.prepare(`
        SELECT id, role, content, timestamp
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY timestamp ASC
      `).all(sessionId);
      
      db.close();
      return NextResponse.json({ messages });
    } else {
      // Get all sessions for user
      const sessions = db.prepare(`
        SELECT id, title, created_at, updated_at,
               (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) as message_count
        FROM chat_sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(user.email);
      
      db.close();
      return NextResponse.json({ sessions });
    }
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve chat history',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
