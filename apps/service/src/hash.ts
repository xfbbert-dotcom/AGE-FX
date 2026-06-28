import { createHash } from "node:crypto";

export type MessageSource = "chatgpt" | "gemini";
export type MessageRole = "user" | "assistant" | "unknown";

export interface HashInput {
  source: MessageSource;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
}

export type AttachmentType = "image" | "file" | "link";

export interface AttachmentHashInput {
  source: MessageSource;
  messageContentHash: string;
  attachmentType: AttachmentType;
  label: string;
  url: string | null;
  mimeType: string | null;
  visibleText: string | null;
  extractedText: string | null;
  analysisText: string | null;
}

export function normalizeMessageText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeNullableText(text: string | null | undefined): string | null {
  if (typeof text !== "string") {
    return null;
  }

  const normalized = normalizeMessageText(text);

  return normalized.length > 0 ? normalized : null;
}

export function createContentHash(input: HashInput): string {
  const hashInput = JSON.stringify({
    source: input.source,
    pageUrl: input.pageUrl.trim(),
    messageRole: input.messageRole,
    messageText: normalizeMessageText(input.messageText)
  });

  return createHash("sha256").update(hashInput, "utf8").digest("hex");
}

export function createAttachmentHash(input: AttachmentHashInput): string {
  const hashInput = JSON.stringify({
    source: input.source,
    messageContentHash: input.messageContentHash.trim().toLowerCase(),
    attachmentType: input.attachmentType,
    label: normalizeMessageText(input.label),
    url: normalizeNullableText(input.url),
    mimeType: normalizeNullableText(input.mimeType),
    visibleText: normalizeNullableText(input.visibleText),
    extractedText: normalizeNullableText(input.extractedText),
    analysisText: normalizeNullableText(input.analysisText)
  });

  return createHash("sha256").update(hashInput, "utf8").digest("hex");
}
