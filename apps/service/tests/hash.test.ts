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
});
