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

export default db;
