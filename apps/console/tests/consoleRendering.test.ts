import { describe, expect, it } from "vitest";
import { renderAnalysis } from "../src/main.js";

describe("console rendering", () => {
  it("renders the battle title and recommended equipment name", () => {
    document.body.innerHTML = `<main id="app"></main>`;

    renderAnalysis({
      analysisDate: "2026-06-19",
      thoughtTitle: "Daily battle for 2026-06-19",
      coreThemes: ["Lake-blue cockpit flow"],
      repeatedQuestions: ["How should FX Burst focus the console?"],
      newlyFormedJudgments: ["I need a practical local console."],
      unclosedThinkingLoops: ["Decide tomorrow's equipment minimum version."],
      reusableMaterial: ["Reusable cockpit panel language"],
      threadsToContinueTomorrow: ["Continue equipment panel tuning."],
      recommendedEquipment: [
        {
          equipmentName: "Lake Blue Concept Card",
          equipmentType: "concept_card",
          whyThisEquipment: "It compresses reusable material into a practical card.",
          sourceBattleInsight: "Lake-blue cockpit flow",
          minimumViableVersion: "One printable card with title, why, and next action.",
          expectedBenefit: "Keeps the next move visible.",
          printPrompt: "Print a lake-blue concept card.",
          state: "recommended"
        }
      ]
    });

    expect(document.body.textContent).toContain("Daily battle for 2026-06-19");
    expect(document.body.textContent).toContain("Lake Blue Concept Card");
  });
});
