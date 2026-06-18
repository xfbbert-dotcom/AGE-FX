import { describe, expect, it } from "vitest";
import { createContentHash, normalizeMessageText } from "../src/hash.js";

describe("message hashing", () => {
  it("normalizes repeated whitespace", () => {
    expect(normalizeMessageText("  Lake\n\nBlue\tIntelligence  ")).toBe(
      "Lake Blue Intelligence"
    );
  });

  it("creates stable hashes for equivalent whitespace", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "AGE   FX"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: " AGE FX "
    });

    expect(first).toBe(second);
  });

  it("changes hash when role changes", () => {
    const userHash = createContentHash({
      source: "gemini",
      pageUrl: "https://gemini.google.com/app/abc",
      messageRole: "user",
      messageText: "same text"
    });
    const assistantHash = createContentHash({
      source: "gemini",
      pageUrl: "https://gemini.google.com/app/abc",
      messageRole: "assistant",
      messageText: "same text"
    });

    expect(userHash).not.toBe(assistantHash);
  });

  it("does not collide when content contains the old field delimiter", () => {
    const delimiter = "\u001f";
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: `https://chatgpt.com/c/abc${delimiter}user`,
      messageRole: "assistant",
      messageText: "same text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: `assistant${delimiter}same text`
    });

    expect(first).not.toBe(second);
  });

  it("changes hash when source changes", () => {
    const chatGptHash = createContentHash({
      source: "chatgpt",
      pageUrl: "https://example.com/conversation",
      messageRole: "user",
      messageText: "same text"
    });
    const geminiHash = createContentHash({
      source: "gemini",
      pageUrl: "https://example.com/conversation",
      messageRole: "user",
      messageText: "same text"
    });

    expect(chatGptHash).not.toBe(geminiHash);
  });

  it("changes hash when pageUrl changes", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "same text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/xyz",
      messageRole: "user",
      messageText: "same text"
    });

    expect(first).not.toBe(second);
  });

  it("changes hash when normalized messageText changes", () => {
    const first = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "first text"
    });
    const second = createContentHash({
      source: "chatgpt",
      pageUrl: "https://chatgpt.com/c/abc",
      messageRole: "user",
      messageText: "second text"
    });

    expect(first).not.toBe(second);
  });

  it("creates deterministic sha256 hex hashes", () => {
    const input = {
      source: "chatgpt" as const,
      pageUrl: " https://chatgpt.com/c/abc ",
      messageRole: "user" as const,
      messageText: "same text"
    };
    const first = createContentHash(input);
    const second = createContentHash(input);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
