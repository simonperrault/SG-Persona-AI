import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// =========================
// Database setup
// =========================
// The SQLite file lives in ./data/ (gitignored).
// DATA_DIR can be overridden via .env, e.g. for tests.

const DATA_DIR = process.env.DATA_DIR || './data';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'sg-persona.db'));

// WAL allows concurrent reads while writing; FKs are off by default in SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =========================
// Schema
// =========================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL,
    title      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user_persona
    ON conversations (user_id, persona_id, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, id);
`);

console.log(`SQLite database ready at ${path.join(DATA_DIR, 'sg-persona.db')}`);

export default db;
