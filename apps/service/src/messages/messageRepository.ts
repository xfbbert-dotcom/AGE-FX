import type { DatabaseSync } from "node:sqlite";
import type { MessageRole, MessageSource } from "../hash.js";

export interface CapturedMessageInput {
  source: MessageSource;
  capturedAt: string;
  conversationDate: string;
  conversationTitle: string;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
  contentHash: string;
}

export interface CapturedMessageRecord extends CapturedMessageInput {
  id: number;
}

interface CapturedMessageRow {
  id: number;
  source: MessageSource;
  captured_at: string;
  conversation_date: string;
  conversation_title: string;
  page_url: string;
  message_role: MessageRole;
  message_text: string;
  content_hash: string;
}

export function insertCapturedMessage(
  db: DatabaseSync,
  message: CapturedMessageInput
): { inserted: boolean } {
  const result = db
    .prepare(`
      INSERT OR IGNORE INTO captured_messages (
        source,
        captured_at,
        conversation_date,
        conversation_title,
        page_url,
        message_role,
        message_text,
        content_hash
      ) VALUES (
        $source,
        $capturedAt,
        $conversationDate,
        $conversationTitle,
        $pageUrl,
        $messageRole,
        $messageText,
        $contentHash
      )
    `)
    .run({
      $source: message.source,
      $capturedAt: message.capturedAt,
      $conversationDate: message.conversationDate,
      $conversationTitle: message.conversationTitle,
      $pageUrl: message.pageUrl,
      $messageRole: message.messageRole,
      $messageText: message.messageText,
      $contentHash: message.contentHash
    });

  return { inserted: result.changes > 0 };
}

export function listMessagesForDate(
  db: DatabaseSync,
  conversationDate: string
): CapturedMessageRecord[] {
  const rows = db
    .prepare(`
      SELECT
        id,
        source,
        captured_at,
        conversation_date,
        conversation_title,
        page_url,
        message_role,
        message_text,
        content_hash
      FROM captured_messages
      WHERE conversation_date = $conversationDate
      ORDER BY captured_at, id
    `)
    .all({ $conversationDate: conversationDate }) as unknown as CapturedMessageRow[];

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    capturedAt: row.captured_at,
    conversationDate: row.conversation_date,
    conversationTitle: row.conversation_title,
    pageUrl: row.page_url,
    messageRole: row.message_role,
    messageText: row.message_text,
    contentHash: row.content_hash
  }));
}
