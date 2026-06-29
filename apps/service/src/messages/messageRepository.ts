import type { DatabaseSync } from "node:sqlite";
import type { AttachmentType, MessageRole, MessageSource } from "../hash.js";

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
  attachments?: CapturedAttachmentRecord[];
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

export interface CapturedAttachmentInput {
  source: MessageSource;
  messageContentHash: string;
  attachmentType: AttachmentType;
  label: string;
  url: string | null;
  mimeType: string | null;
  visibleText: string | null;
  extractedText: string | null;
  analysisText: string | null;
  snapshotDataUrl: string | null;
  attachmentHash: string;
}

export interface CapturedAttachmentRecord extends CapturedAttachmentInput {
  id: number;
  capturedAt: string;
  conversationDate: string;
  pageUrl: string;
}

export interface InsertCapturedAttachmentsResult {
  inserted: number;
  duplicates: number;
}

interface CapturedAttachmentRow {
  id: number;
  source: MessageSource;
  captured_at: string;
  conversation_date: string;
  page_url: string;
  message_content_hash: string;
  attachment_type: AttachmentType;
  label: string;
  url: string | null;
  mime_type: string | null;
  visible_text: string | null;
  extracted_text: string | null;
  analysis_text: string | null;
  snapshot_data_url: string | null;
  attachment_hash: string;
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

export function insertCapturedAttachments(
  db: DatabaseSync,
  message: CapturedMessageInput,
  attachments: CapturedAttachmentInput[]
): InsertCapturedAttachmentsResult {
  let inserted = 0;
  let duplicates = 0;

  for (const attachment of attachments) {
    const result = db
      .prepare(`
        INSERT INTO captured_attachments (
          source,
          captured_at,
          conversation_date,
          page_url,
          message_content_hash,
          attachment_type,
          label,
          url,
          mime_type,
          visible_text,
          extracted_text,
          analysis_text,
          snapshot_data_url,
          attachment_hash
        ) VALUES (
          $source,
          $capturedAt,
          $conversationDate,
          $pageUrl,
          $messageContentHash,
          $attachmentType,
          $label,
          $url,
          $mimeType,
          $visibleText,
          $extractedText,
          $analysisText,
          $snapshotDataUrl,
          $attachmentHash
        )
        ON CONFLICT(attachment_hash) DO NOTHING
      `)
      .run({
        $source: attachment.source,
        $capturedAt: message.capturedAt,
        $conversationDate: message.conversationDate,
        $pageUrl: message.pageUrl,
        $messageContentHash: attachment.messageContentHash,
        $attachmentType: attachment.attachmentType,
        $label: attachment.label,
        $url: attachment.url,
        $mimeType: attachment.mimeType,
        $visibleText: attachment.visibleText,
        $extractedText: attachment.extractedText,
        $analysisText: attachment.analysisText,
        $snapshotDataUrl: attachment.snapshotDataUrl,
        $attachmentHash: attachment.attachmentHash
      });

    if (result.changes > 0) {
      inserted += 1;
    } else {
      duplicates += 1;
    }
  }

  return { inserted, duplicates };
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

  const attachments = listAttachmentsForDate(db, conversationDate);
  const attachmentsByMessageHash = new Map<string, CapturedAttachmentRecord[]>();

  for (const attachment of attachments) {
    const existing = attachmentsByMessageHash.get(attachment.messageContentHash) ?? [];
    existing.push(attachment);
    attachmentsByMessageHash.set(attachment.messageContentHash, existing);
  }

  return rows.map((row) => {
    const message = mapCapturedMessageRow(row);
    const messageAttachments = attachmentsByMessageHash.get(message.contentHash);

    return messageAttachments?.length
      ? { ...message, attachments: messageAttachments }
      : message;
  });
}

export function listAttachmentsForDate(
  db: DatabaseSync,
  conversationDate: string
): CapturedAttachmentRecord[] {
  const rows = db
    .prepare(`
      SELECT
        id,
        source,
        captured_at,
        conversation_date,
        page_url,
        message_content_hash,
        attachment_type,
        label,
        url,
        mime_type,
        visible_text,
        extracted_text,
        analysis_text,
        snapshot_data_url,
        attachment_hash
      FROM captured_attachments
      WHERE conversation_date = $conversationDate
      ORDER BY captured_at, id
    `)
    .all({ $conversationDate: conversationDate }) as unknown as CapturedAttachmentRow[];

  return rows.map(mapCapturedAttachmentRow);
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

function mapCapturedAttachmentRow(row: CapturedAttachmentRow): CapturedAttachmentRecord {
  return {
    id: row.id,
    source: row.source,
    capturedAt: row.captured_at,
    conversationDate: row.conversation_date,
    pageUrl: row.page_url,
    messageContentHash: row.message_content_hash,
    attachmentType: row.attachment_type,
    label: row.label,
    url: row.url,
    mimeType: row.mime_type,
    visibleText: row.visible_text,
    extractedText: row.extracted_text,
    analysisText: row.analysis_text,
    snapshotDataUrl: row.snapshot_data_url,
    attachmentHash: row.attachment_hash
  };
}
