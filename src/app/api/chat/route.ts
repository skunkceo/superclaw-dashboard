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
  const dbDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
  const dbPath = join(dbDir, 'chat.db');
  
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

    // Send message to OpenClaw via queue bridge
    const queueDir = '/root/clawd/queue/superclaw-messages';
    const messageId = `msg-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const messagePath = join(queueDir, `${messageId}.json`);
    const responsePath = join(queueDir, `${messageId}-response.json`);

    const queueMessage = {
      id: messageId,
      message: message,
      sessionId: actualSessionId,
      from: user.email,
      timestamp: now,
      status: 'pending',
      responseFile: responsePath,
    };

    try {
      writeFileSync(messagePath, JSON.stringify(queueMessage, null, 2));

      // Wait for response (up to 60 seconds - Claude needs time to think)
      const maxWait = 60000;
      const startTime = Date.now();
      let response = null;

      while (Date.now() - startTime < maxWait) {
        if (existsSync(responsePath)) {
          response = JSON.parse(readFileSync(responsePath, 'utf8'));
          break;
        }
        // Wait 100ms before checking again (faster polling)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!response) {
        return NextResponse.json({
          error: 'Request timed out',
          message: 'The assistant is taking longer than expected to respond.',
          sessionId: actualSessionId,
        }, { status: 504 });
      }

      // Save assistant response to database
      const db2 = getChatDb();
      db2.prepare(`
        INSERT INTO chat_messages (session_id, role, content, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(actualSessionId, 'assistant', response.reply, response.timestamp || Date.now());
      db2.close();

      return NextResponse.json({
        message: response.message || response.reply,
        reply: response.message || response.reply,
        sessionId: actualSessionId,
        messageId: response.messageId,
      });

    } catch (error) {
      console.error('Queue bridge error:', error);
      return NextResponse.json({
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
        sessionId: actualSessionId,
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

// DELETE - Delete a chat session
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const db = getChatDb();
    
    // Verify session belongs to user
    const session = db.prepare('SELECT user_id FROM chat_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      db.close();
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.user_id !== user.email) {
      db.close();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete messages first (foreign key constraint)
    db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
    
    // Delete session
    db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(sessionId);
    
    db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat session',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
