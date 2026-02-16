import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Store database in user's config directory
const dataDir = process.env.SUPERCLAW_DATA_DIR || join(process.env.HOME || '/root', '.superclaw');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'superclaw.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'view',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_login INTEGER,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// Agent definitions table
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    soul TEXT,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    skills TEXT DEFAULT '[]',
    tools TEXT DEFAULT '[]',
    color TEXT DEFAULT '#f97316',
    icon TEXT DEFAULT 'bot',
    memory_dir TEXT,
    system_prompt TEXT,
    max_tokens INTEGER,
    thinking TEXT DEFAULT 'low',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    created_by INTEGER,
    spawn_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

// Tasks table for Porter orchestration
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_agent TEXT,
    what_doing TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    completed_at INTEGER,
    session_id TEXT,
    FOREIGN KEY (assigned_agent) REFERENCES agent_definitions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent);
  CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
`);

export type UserRole = 'view' | 'edit' | 'admin';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: number;
  last_login: number | null;
  created_by: number | null;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: number;
  created_at: number;
}

// User operations
export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(email: string, passwordHash: string, role: UserRole, createdBy?: number): number {
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, role, created_by) VALUES (?, ?, ?, ?)'
  ).run(email, passwordHash, role, createdBy || null);
  return result.lastInsertRowid as number;
}

export function updateLastLogin(id: number): void {
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), id);
}

export function getAllUsers(): Omit<User, 'password_hash'>[] {
  return db.prepare('SELECT id, email, role, created_at, last_login, created_by FROM users').all() as Omit<User, 'password_hash'>[];
}

export function updateUserRole(id: number, role: UserRole): void {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
}

export function deleteUser(id: number): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function updateUserPassword(id: number, passwordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

export function getUserCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return result.count;
}

// Session operations
export function createSession(userId: number, sessionId: string, expiresAt: number): void {
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(sessionId, userId, expiresAt);
}

export function getSession(sessionId: string): (Session & { user: Omit<User, 'password_hash'> }) | undefined {
  const session = db.prepare(`
    SELECT s.*, u.id as u_id, u.email, u.role, u.created_at as u_created_at, u.last_login, u.created_by
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, Date.now()) as (Session & { u_id: number; email: string; role: UserRole; u_created_at: number; last_login: number | null; created_by: number | null }) | undefined;
  
  if (!session) return undefined;
  
  return {
    id: session.id,
    user_id: session.user_id,
    expires_at: session.expires_at,
    created_at: session.created_at,
    user: {
      id: session.u_id,
      email: session.email,
      role: session.role,
      created_at: session.u_created_at,
      last_login: session.last_login,
      created_by: session.created_by,
    },
  };
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function deleteUserSessions(userId: number): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

// Agent definition types
export interface AgentDefinition {
  id: string;
  name: string;
  description: string | null;
  soul: string | null;
  model: string;
  skills: string; // JSON array
  tools: string; // JSON array
  color: string;
  icon: string;
  memory_dir: string | null;
  system_prompt: string | null;
  max_tokens: number | null;
  thinking: string;
  created_at: number;
  updated_at: number;
  created_by: number | null;
  spawn_count: number;
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return db.prepare('SELECT * FROM agent_definitions ORDER BY name').all() as AgentDefinition[];
}

export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return db.prepare('SELECT * FROM agent_definitions WHERE id = ?').get(id) as AgentDefinition | undefined;
}

export function createAgentDefinition(agent: Omit<AgentDefinition, 'created_at' | 'updated_at' | 'spawn_count'>): void {
  db.prepare(`
    INSERT INTO agent_definitions (id, name, description, soul, model, skills, tools, color, icon, memory_dir, system_prompt, max_tokens, thinking, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    agent.id, agent.name, agent.description, agent.soul, agent.model,
    agent.skills, agent.tools, agent.color, agent.icon, agent.memory_dir,
    agent.system_prompt, agent.max_tokens, agent.thinking, agent.created_by
  );
}

export function updateAgentDefinition(id: string, updates: Partial<AgentDefinition>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (['id', 'created_at', 'spawn_count'].includes(key)) continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  db.prepare(`UPDATE agent_definitions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteAgentDefinition(id: string): void {
  db.prepare('DELETE FROM agent_definitions WHERE id = ?').run(id);
}

export function incrementAgentSpawnCount(id: string): void {
  db.prepare('UPDATE agent_definitions SET spawn_count = spawn_count + 1 WHERE id = ?').run(id);
}

// Task types and functions
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  assigned_agent: string | null;
  what_doing: string | null;
  created_at: number;
  completed_at: number | null;
  session_id: string | null;
}

export function getAllTasks(filters?: { status?: string; agent?: string }): Task[] {
  let query = 'SELECT * FROM tasks';
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters?.agent) {
    conditions.push('assigned_agent = ?');
    values.push(filters.agent);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...values) as Task[];
}

export function getTaskById(id: string): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
}

export function createTask(task: Omit<Task, 'created_at'>): void {
  db.prepare(`
    INSERT INTO tasks (id, title, status, assigned_agent, what_doing, completed_at, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id, task.title, task.status, task.assigned_agent,
    task.what_doing, task.completed_at, task.session_id
  );
}

export function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'created_at') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTask(id: string): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

export default db;
