import type { DatabaseSync } from "node:sqlite";

export function applySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS captured_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK (source IN ('chatgpt', 'gemini')),
      captured_at TEXT NOT NULL,
      conversation_date TEXT NOT NULL,
      conversation_title TEXT NOT NULL,
      page_url TEXT NOT NULL,
      message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'unknown')),
      message_text TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_captured_messages_date
      ON captured_messages (conversation_date);

    CREATE TABLE IF NOT EXISTS daily_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_date TEXT NOT NULL UNIQUE,
      summary_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('recommended', 'approved', 'printed', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
