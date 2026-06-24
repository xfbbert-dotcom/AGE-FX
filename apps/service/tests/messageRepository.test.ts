import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createContentHash } from "../src/hash.js";
import { openAgeDatabase } from "../src/db/client.js";
import {
  insertCapturedMessage,
  listMessagesForDate
} from "../src/messages/messageRepository.js";

describe("message repository", () => {
  let tempRoot: string | undefined;
  let db: DatabaseSync | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;

    if (tempRoot) {
      rmSync(tempRoot, { force: true, recursive: true });
      tempRoot = undefined;
    }
  });

  it("stores captured messages once by content hash and lists them for a date", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-"));
    db = openAgeDatabase(tempRoot);
    const message = {
      source: "chatgpt" as const,
      capturedAt: "2026-06-19T12:34:56.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: null,
      pageUrl: "https://chatgpt.com/c/example",
      messageRole: "user" as const,
      messageText: "Store this captured thought",
      contentHash: createContentHash({
        source: "chatgpt",
        pageUrl: "https://chatgpt.com/c/example",
        messageRole: "user",
        messageText: "Store this captured thought"
      })
    };

    expect(insertCapturedMessage(db, message)).toEqual({ inserted: true });
    expect(insertCapturedMessage(db, message)).toEqual({ inserted: false });

    expect(listMessagesForDate(db, "2026-06-19")).toEqual([
      {
        id: 1,
        ...message
      }
    ]);
  });

  it("merges a streaming assistant reply into the existing row", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-"));
    db = openAgeDatabase(tempRoot);
    const baseMessage = {
      source: "gemini" as const,
      capturedAt: "2026-06-19T12:34:56.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: "AGE-FX planning",
      pageUrl: "https://gemini.google.com/app/example",
      messageRole: "assistant" as const
    };
    const partialText = "Gemini says architecture starts with clear boundaries.";
    const completeText =
      "Gemini says architecture starts with clear boundaries. Then it explains data flow and ownership.";
    const partialMessage = {
      ...baseMessage,
      messageText: partialText,
      contentHash: createContentHash({
        ...baseMessage,
        messageText: partialText
      })
    };
    const completeMessage = {
      ...baseMessage,
      capturedAt: "2026-06-19T12:35:01.000Z",
      messageText: completeText,
      contentHash: createContentHash({
        ...baseMessage,
        messageText: completeText
      })
    };

    expect(insertCapturedMessage(db, partialMessage)).toEqual({ inserted: true });
    expect(insertCapturedMessage(db, completeMessage)).toEqual({
      inserted: false,
      merged: true
    });

    expect(listMessagesForDate(db, "2026-06-19")).toEqual([
      {
        id: 1,
        ...completeMessage
      }
    ]);
  });

  it("throws on invalid source or role constraints", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-"));
    db = openAgeDatabase(tempRoot);
    const message = {
      source: "chatgpt" as const,
      capturedAt: "2026-06-19T12:34:56.000Z",
      conversationDate: "2026-06-19",
      conversationTitle: "AGE-FX planning",
      pageUrl: "https://chatgpt.com/c/example",
      messageRole: "user" as const,
      messageText: "Store this captured thought",
      contentHash: createContentHash({
        source: "chatgpt",
        pageUrl: "https://chatgpt.com/c/example",
        messageRole: "user",
        messageText: "Store this captured thought"
      })
    };

    expect(() =>
      insertCapturedMessage(db as DatabaseSync, {
        ...message,
        source: "claude",
        contentHash: "invalid-source"
      } as unknown as Parameters<typeof insertCapturedMessage>[1])
    ).toThrow();
    expect(() =>
      insertCapturedMessage(db as DatabaseSync, {
        ...message,
        messageRole: "system",
        contentHash: "invalid-role"
      } as unknown as Parameters<typeof insertCapturedMessage>[1])
    ).toThrow();
  });
});
