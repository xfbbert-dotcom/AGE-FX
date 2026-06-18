import { createHash } from "node:crypto";

export type MessageSource = "chatgpt" | "gemini";
export type MessageRole = "user" | "assistant" | "unknown";

export interface HashInput {
  source: MessageSource;
  pageUrl: string;
  messageRole: MessageRole;
  messageText: string;
}

export function normalizeMessageText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
