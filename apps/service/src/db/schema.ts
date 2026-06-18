import type { DatabaseSync } from "node:sqlite";

export function applySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS captured_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK (source IN ('chatgpt', 'gemini')),
      captured_at TEXT NOT NULL,
      conversation_date TEXT NOT NULL,
      conversation_title TEXT,
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
      thought_title TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_date TEXT NOT NULL,
      equipment_name TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      why_this_equipment TEXT NOT NULL,
      source_battle_insight TEXT NOT NULL,
      minimum_viable_version TEXT NOT NULL,
      expected_benefit TEXT NOT NULL,
      print_prompt TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('recommended', 'approved', 'printed', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
