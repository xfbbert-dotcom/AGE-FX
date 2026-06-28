import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { getDailyAnalysis, upsertDailyAnalysis } from "../src/analysis/analysisRepository.js";
import { analyzeDailyBattle } from "../src/analysis/analyzer.js";
import { openAgeDatabase } from "../src/db/client.js";
import { listEquipmentItems } from "../src/equipment/equipmentRepository.js";
import { createContentHash } from "../src/hash.js";
import { insertCapturedMessage } from "../src/messages/messageRepository.js";
import {
  previousLocalIsoDate,
  msUntilNextLocalMidnight,
  listPendingSettlementDates,
  settlePendingBattles
} from "../src/settlement/dailySettlement.js";

describe("daily AGE settlement", () => {
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

  function openTestDatabase(): DatabaseSync {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-settlement-"));
    db = openAgeDatabase(tempRoot);

    return db;
  }

  function captureThought(database: DatabaseSync, date: string, text: string): void {
    insertCapturedMessage(database, {
      source: "chatgpt",
      capturedAt: `${date}T12:00:00.000Z`,
      conversationDate: date,
      conversationTitle: "AGE-FX settlement",
      pageUrl: `https://chatgpt.com/c/${date}`,
      messageRole: "user",
      messageText: text,
      contentHash: createContentHash({
        source: "chatgpt",
        pageUrl: `https://chatgpt.com/c/${date}`,
        messageRole: "user",
        messageText: text
      })
    });
  }

  it("settles the calendar day that just ended at local midnight", () => {
    const justAfterMidnight = new Date(2026, 5, 21, 0, 0, 1);

    expect(previousLocalIsoDate(justAfterMidnight)).toBe("2026-06-20");
  });

  it("computes the delay until the next local midnight", () => {
    const noon = new Date(2026, 5, 20, 12, 0, 0);

    expect(msUntilNextLocalMidnight(noon)).toBe(12 * 60 * 60 * 1000);
  });

  it("finds captured ended days that missed formal settlement while AGE-FX was closed", () => {
    const database = openTestDatabase();
    captureThought(database, "2026-06-26", "This day was already analyzed.");
    captureThought(database, "2026-06-27", "This day was captured while AGE-FX was later closed.");
    captureThought(database, "2026-06-28", "Today is still collecting and must not settle yet.");
    upsertDailyAnalysis(database, analyzeDailyBattle("2026-06-26", []));

    expect(listPendingSettlementDates(database, new Date(2026, 5, 28, 9, 0, 0))).toEqual([
      "2026-06-27"
    ]);
  });

  it("stores missed settlement analysis and equipment when AGE-FX starts after midnight", async () => {
    const database = openTestDatabase();
    captureThought(database, "2026-06-27", "Startup should backfill yesterday's AGE-FX analysis.");

    await settlePendingBattles(database, new Date(2026, 5, 28, 9, 0, 0), {
      analyze: async (analysisDate) => ({
        analysisDate,
        thoughtTitle: "Startup backfill analysis",
        thoughtSummary: "Backfilled after AGE-FX started later than midnight.",
        coreThemes: [],
        repeatedQuestions: [],
        newlyFormedJudgments: [],
        unclosedThinkingLoops: [],
        reusableMaterial: [],
        threadsToContinueTomorrow: [],
        recommendedEquipment: [
          {
            equipmentName: "Backfill Card",
            equipmentType: "settlement_backfill",
            whyThisEquipment: "The user opened AGE-FX after local midnight.",
            sourceBattleInsight: "Captured messages existed without a formal settlement.",
            minimumViableVersion: "Store one backfilled equipment record.",
            expectedBenefit: "The missed day appears in the console.",
            printPrompt: "Print the backfilled card.",
            state: "recommended"
          }
        ]
      })
    });

    expect(getDailyAnalysis(database, "2026-06-27").report.thoughtTitle).toBe(
      "Startup backfill analysis"
    );
    expect(listEquipmentItems(database)).toHaveLength(1);
  });
});
