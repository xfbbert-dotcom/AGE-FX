import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import {
  createContentHash,
  detectSource,
  extractVisibleMessages,
  filterUnsentMessages,
  formatLocalDate,
  normalizeMessageText
} from "../src/content.js";

function loadFixture(name: string, url: string): void {
  const html = readFileSync(resolve("fixtures", name), "utf8");
  const dom = new JSDOM(html, { url });

  globalThis.document = dom.window.document;
}

describe("Edge extension content capture", () => {
  it("detects supported conversation sources from page URLs", () => {
    expect(detectSource("https://chatgpt.com/c/age-fx")).toBe("chatgpt");
    expect(detectSource("https://gemini.google.com/app/age-fx")).toBe("gemini");
    expect(detectSource("https://example.com/not-supported")).toBeNull();
  });

  it("normalizes message whitespace", () => {
    expect(normalizeMessageText("  Lake\n\nblue\t\tthought   card  ")).toBe(
      "Lake blue thought card"
    );
  });

  it("extracts ChatGPT user and assistant messages", async () => {
    loadFixture("chatgpt-sample.html", "https://chatgpt.com/c/age-fx");

    const messages = await extractVisibleMessages("https://chatgpt.com/c/age-fx");

    expect(messages).toHaveLength(2);
    expect(messages).toEqual([
      expect.objectContaining({
        source: "chatgpt",
        conversationTitle: "AGE-FX ChatGPT Sample",
        pageUrl: "https://chatgpt.com/c/age-fx",
        messageRole: "user",
        messageText: "Can this become a Lake Blue Concept Card?"
      }),
      expect.objectContaining({
        source: "chatgpt",
        messageRole: "assistant",
        messageText: "Yes. Capture it, score it, and recommend equipment."
      })
    ]);
    expect(messages.every((message) => /^[a-f0-9]{64}$/.test(message.contentHash))).toBe(
      true
    );
  });

  it("extracts ChatGPT messages from numbered conversation turn test ids", async () => {
    const dom = new JSDOM(
      `<!doctype html>
      <title>AGE-FX Numbered ChatGPT Sample</title>
      <main>
        <section data-testid="conversation-turn-1" aria-label="You said">
          <p>今天我在思考 AGE 系统如何整理灵感。</p>
        </section>
        <section data-testid="conversation-turn-2" aria-label="ChatGPT said">
          <p>可以把它抽象为战况分析和装备生成。</p>
        </section>
      </main>`,
      { url: "https://chatgpt.com/c/age-fx" }
    );
    globalThis.document = dom.window.document;

    const messages = await extractVisibleMessages("https://chatgpt.com/c/age-fx");

    expect(messages).toHaveLength(2);
    expect(messages).toEqual([
      expect.objectContaining({
        source: "chatgpt",
        messageRole: "user",
        messageText: "今天我在思考 AGE 系统如何整理灵感。"
      }),
      expect.objectContaining({
        source: "chatgpt",
        messageRole: "assistant",
        messageText: "可以把它抽象为战况分析和装备生成。"
      })
    ]);
  });

  it("extracts Gemini user and assistant messages", async () => {
    loadFixture("gemini-sample.html", "https://gemini.google.com/app/age-fx");

    const messages = await extractVisibleMessages("https://gemini.google.com/app/age-fx");

    expect(messages).toHaveLength(2);
    expect(messages).toEqual([
      expect.objectContaining({
        source: "gemini",
        conversationTitle: "AGE-FX Gemini Sample",
        pageUrl: "https://gemini.google.com/app/age-fx",
        messageRole: "user",
        messageText: "Track this reflective pattern for later."
      }),
      expect.objectContaining({
        source: "gemini",
        messageRole: "assistant",
        messageText: "I will preserve the pattern as a captured thought."
      })
    ]);
  });

  it("formats local dates without UTC slicing", () => {
    expect(formatLocalDate(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });

  it("creates correct sha256 hex content hashes from structured JSON preimages", async () => {
    await expect(createContentHash("hello")).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );

    const hash = await createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/age-fx",
      messageRole: "user",
      messageText: "Lake blue thought"
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("filters messages already marked as sent", () => {
    const sentHashes = new Set(["already-sent"]);
    const messages = [
      { contentHash: "already-sent" },
      { contentHash: "new-message" }
    ];

    expect(filterUnsentMessages(messages, sentHashes)).toEqual([
      { contentHash: "new-message" }
    ]);
    expect([...sentHashes]).toEqual(["already-sent", "new-message"]);
  });

  it("does not import Node modules from browser content code", () => {
    const contentSource = readFileSync(resolve("extension/edge/src/content.js"), "utf8");

    expect(contentSource).not.toMatch(/\bfrom\s+["']node:/);
    expect(contentSource).not.toMatch(/\brequire\s*\(/);
  });

  it("relays capture through the extension runtime instead of fetching localhost directly", () => {
    const contentSource = readFileSync(resolve("extension/edge/src/content.js"), "utf8");

    expect(contentSource).toContain("chrome.runtime");
    expect(contentSource).toContain(".sendMessage");
    expect(contentSource).not.toContain("/api/capture");
  });
});
