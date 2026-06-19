import { describe, expect, it } from "vitest";
import type { CapturedMessageRecord } from "../src/messages/messageRepository.js";
import { analyzeDailyBattle } from "../src/analysis/analyzer.js";

function capturedMessage(
  id: number,
  messageRole: CapturedMessageRecord["messageRole"],
  messageText: string
): CapturedMessageRecord {
  return {
    id,
    source: "chatgpt",
    capturedAt: `2026-06-19T12:0${id}:00.000Z`,
    conversationDate: "2026-06-19",
    conversationTitle: "AGE-FX planning",
    pageUrl: "https://chatgpt.com/c/example",
    messageRole,
    messageText,
    contentHash: `${id}`.padStart(64, "0")
  };
}

describe("daily battle analyzer", () => {
  it("returns a capture-check battle record for an empty day", () => {
    const analysis = analyzeDailyBattle("2026-06-19", []);

    expect(analysis).toMatchObject({
      analysisDate: "2026-06-19",
      thoughtTitle: "No captured battle record",
      coreThemes: [],
      repeatedQuestions: [],
      newlyFormedJudgments: [],
      unclosedThinkingLoops: [],
      reusableMaterial: []
    });
    expect(analysis.threadsToContinueTomorrow).toEqual([
      "Open ChatGPT or Gemini in Edge with C-Funnels enabled so AGE-FX can capture tomorrow's battle record."
    ]);
    expect(analysis.recommendedEquipment).toEqual([
      expect.objectContaining({
        equipmentName: "C-Funnels Capture Check",
        state: "recommended"
      })
    ]);
  });

  it("extracts question-like user messages and recommends one concept card", () => {
    const analysis = analyzeDailyBattle("2026-06-19", [
      capturedMessage(
        1,
        "user",
        "Could Lake Blue Concept Card become a reusable product planning tool?"
      ),
      capturedMessage(
        2,
        "assistant",
        "It could become a planning card if you define the inputs."
      ),
      capturedMessage(
        3,
        "user",
        "I think the card should help capture tool ideas before they disappear."
      ),
      capturedMessage(
        4,
        "user",
        "Need to decide tomorrow: what is the minimum viable version?"
      )
    ]);

    expect(analysis.thoughtTitle).toBe("Daily battle for 2026-06-19");
    expect(analysis.repeatedQuestions).toEqual([
      "Could Lake Blue Concept Card become a reusable product planning tool?",
      "Need to decide tomorrow: what is the minimum viable version?"
    ]);
    expect(analysis.newlyFormedJudgments).toEqual([
      "I think the card should help capture tool ideas before they disappear."
    ]);
    expect(analysis.unclosedThinkingLoops).toEqual([
      "Need to decide tomorrow: what is the minimum viable version?"
    ]);
    expect(analysis.reusableMaterial).toEqual([
      "Could Lake Blue Concept Card become a reusable product planning tool?",
      "I think the card should help capture tool ideas before they disappear."
    ]);
    expect(analysis.recommendedEquipment).toHaveLength(1);
    expect(analysis.recommendedEquipment[0]).toMatchObject({
      equipmentName: "Lake Blue Concept Card",
      state: "recommended",
      sourceBattleInsight:
        "Could Lake Blue Concept Card become a reusable product planning tool?"
    });
    expect(JSON.stringify(analysis)).not.toContain("assistant");
  });
});
