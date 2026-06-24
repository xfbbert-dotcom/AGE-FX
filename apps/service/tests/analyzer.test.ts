import { describe, expect, it } from "vitest";
import type { CapturedMessageRecord } from "../src/messages/messageRepository.js";
import { analyzeDailyBattle } from "../src/analysis/analyzer.js";

function capturedMessage(
  id: number,
  messageRole: CapturedMessageRecord["messageRole"],
  messageText: string,
  source: CapturedMessageRecord["source"] = "chatgpt"
): CapturedMessageRecord {
  return {
    id,
    source,
    capturedAt: `2026-06-19T12:${String(id).padStart(2, "0")}:00.000Z`,
    conversationDate: "2026-06-19",
    conversationTitle: "AGE-FX planning",
    pageUrl:
      source === "gemini"
        ? "https://gemini.google.com/app/example"
        : "https://chatgpt.com/c/example",
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

  it("summarizes captured conversations instead of echoing raw user text", () => {
    const rawQuestion =
      "Could Lake Blue Concept Card become a reusable product planning tool?";
    const rawJudgment =
      "I think the card should help capture tool ideas before they disappear.";
    const rawLoop = "Need to decide tomorrow: what is the minimum viable version?";

    const analysis = analyzeDailyBattle("2026-06-19", [
      capturedMessage(1, "user", rawQuestion),
      capturedMessage(2, "assistant", "It could become a planning card if you define the inputs."),
      capturedMessage(3, "user", rawJudgment, "gemini"),
      capturedMessage(4, "user", rawLoop)
    ]);

    expect(analysis.thoughtTitle).toBe("Daily battle for 2026-06-19");
    expect(analysis.thoughtSummary).toContain("今天的思考主线");
    expect(analysis.thoughtSummary).toContain("GPT/Gemini");
    expect(analysis.thoughtSummary).toContain("推荐打印");
    expect(analysis.thoughtSummary.length).toBeGreaterThan(450);
    expect(analysis.coreThemes).toContainEqual(expect.stringContaining("tool"));
    expect(analysis.coreThemes).toContainEqual(expect.stringContaining("conversation"));
    expect(analysis.repeatedQuestions).toEqual([
      expect.stringContaining("question cluster")
    ]);
    expect(analysis.newlyFormedJudgments).toEqual([
      expect.stringContaining("working preference")
    ]);
    expect(analysis.unclosedThinkingLoops).toEqual([
      expect.stringContaining("open loop")
    ]);
    expect(analysis.reusableMaterial).toContainEqual(
      expect.stringContaining("Reusable material")
    );
    expect(analysis.recommendedEquipment).toHaveLength(1);
    expect(analysis.recommendedEquipment[0]).toMatchObject({
      equipmentName: "Lake Blue Concept Card",
      state: "recommended"
    });

    const serializedAnalysis = JSON.stringify(analysis);
    expect(serializedAnalysis).not.toContain(rawQuestion);
    expect(serializedAnalysis).not.toContain(rawJudgment);
    expect(serializedAnalysis).not.toContain(rawLoop);
    expect(serializedAnalysis).not.toContain("It could become a planning card");
  });

  it("uses the latest meaningful thread and filters capture noise", () => {
    const analysis = analyzeDailyBattle("2026-06-19", [
      capturedMessage(
        1,
        "user",
        "Could an old architecture whitepaper become a reusable system prompt tool? ".repeat(60)
      ),
      capturedMessage(2, "assistant", "ChatGPT says: creating image final tuning..."),
      capturedMessage(3, "assistant", "You said: selected text cancel send"),
      capturedMessage(
        4,
        "user",
        "I think the preview should focus on the newest captured equipment idea."
      )
    ]);

    expect(analysis.recommendedEquipment[0].sourceBattleInsight).toContain("preview");
    expect(JSON.stringify(analysis)).not.toContain("creating image");
    expect(JSON.stringify(analysis)).not.toContain("cancel send");
    expect(JSON.stringify(analysis)).not.toContain("old architecture whitepaper");
    expect(analysis.coreThemes.join(" ").length).toBeLessThan(600);
  });

  it("changes the synthesized preview when later same-day material adds a new topic", () => {
    const before = analyzeDailyBattle("2026-06-19", [
      capturedMessage(1, "user", "How should the preview refresh work in the console?"),
      capturedMessage(2, "assistant", "The preview should read today's captured messages.")
    ]);
    const after = analyzeDailyBattle("2026-06-19", [
      capturedMessage(1, "user", "How should the preview refresh work in the console?"),
      capturedMessage(2, "assistant", "The preview should read today's captured messages."),
      capturedMessage(
        3,
        "user",
        "The midnight settlement must summarize the complete day before equipment is recommended.",
        "gemini"
      ),
      capturedMessage(
        4,
        "assistant",
        "That keeps formal equipment tied to the just-ended day instead of every live capture.",
        "gemini"
      )
    ]);

    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
    expect(after.coreThemes.join(" ")).toContain("daily settlement cadence");
    expect(after.coreThemes.join(" ")).toContain("4 captured turns");
    expect(after.reusableMaterial.join(" ")).toContain("settlement");
  });

  it("uses assistant replies as analytical evidence without quoting them", () => {
    const assistantEvidence =
      "Gemini says the SQLite database should keep raw records separate from synthesized console panels.";
    const analysis = analyzeDailyBattle("2026-06-19", [
      capturedMessage(1, "user", "What should the console show after capture?"),
      capturedMessage(2, "assistant", assistantEvidence, "gemini")
    ]);

    expect(analysis.coreThemes.join(" ")).toContain("database");
    expect(analysis.coreThemes.join(" ")).toContain("assistant replies");
    expect(JSON.stringify(analysis)).not.toContain(assistantEvidence);
  });
});
