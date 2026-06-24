import type { DatabaseSync } from "node:sqlite";
import type { MessageRole, MessageSource } from "../hash.js";

export interface CapturedMessageInput {
  source: MessageSource;
  capturedAt: string;
  conversationDate: string;
  conversationTitle: string | null;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
  contentHash: string;
}

export interface CapturedMessageRecord extends CapturedMessageInput {
  id: number;
}

export interface InsertCapturedMessageResult {
  inserted: boolean;
  merged?: boolean;
}

interface CapturedMessageRow {
  id: number;
  source: MessageSource;
  captured_at: string;
  conversation_date: string;
  conversation_title: string | null;
  page_url: string;
  message_role: MessageRole;
  message_text: string;
  content_hash: string;
}

export function insertCapturedMessage(
  db: DatabaseSync,
  message: CapturedMessageInput
): InsertCapturedMessageResult {
  const mergeCandidate = findStreamingMergeCandidate(db, message);

  if (mergeCandidate) {
    db.prepare(`
      UPDATE captured_messages
      SET captured_at = $capturedAt,
          conversation_title = $conversationTitle,
          message_text = $messageText,
          content_hash = $contentHash
      WHERE id = $id
    `).run({
      $id: mergeCandidate.id,
      $capturedAt: message.capturedAt,
      $conversationTitle: message.conversationTitle,
      $messageText: message.messageText,
      $contentHash: message.contentHash
    });

    return { inserted: false, merged: true };
  }

  const result = db
    .prepare(`
      INSERT INTO captured_messages (
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
      ON CONFLICT(content_hash) DO NOTHING
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

function normalizeForMerge(messageText: string): string {
  return messageText.replace(/\s+/g, " ").trim();
}

function isStreamingExtension(previousText: string, nextText: string): boolean {
  const previous = normalizeForMerge(previousText);
  const next = normalizeForMerge(nextText);

  return previous.length >= 24 && next.length > previous.length && next.startsWith(previous);
}

function findStreamingMergeCandidate(
  db: DatabaseSync,
  message: CapturedMessageInput
): CapturedMessageRecord | null {
  if (message.messageRole !== "assistant") {
    return null;
  }

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
        AND source = $source
        AND page_url = $pageUrl
        AND message_role = $messageRole
      ORDER BY captured_at DESC, id DESC
      LIMIT 5
    `)
    .all({
      $conversationDate: message.conversationDate,
      $source: message.source,
      $pageUrl: message.pageUrl,
      $messageRole: message.messageRole
    }) as unknown as CapturedMessageRow[];

  const row = rows.find((candidate) =>
    isStreamingExtension(candidate.message_text, message.messageText)
  );

  return row ? mapCapturedMessageRow(row) : null;
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
    ...mapCapturedMessageRow(row)
  }));
}

function mapCapturedMessageRow(row: CapturedMessageRow): CapturedMessageRecord {
  return {
    id: row.id,
    source: row.source,
    capturedAt: row.captured_at,
    conversationDate: row.conversation_date,
    conversationTitle: row.conversation_title,
    pageUrl: row.page_url,
    messageRole: row.message_role,
    messageText: row.message_text,
    contentHash: row.content_hash
  };
}
