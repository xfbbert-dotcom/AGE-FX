import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { openAgeDatabase } from "../src/db/client.js";
import {
  createEquipmentRecommendation,
  getEquipmentItem,
  updateEquipmentState
} from "../src/equipment/equipmentRepository.js";

describe("equipment repository", () => {
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

  it("records recommendations and updates state timestamps", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "age-fx-equipment-"));
    db = openAgeDatabase(tempRoot);

    const created = createEquipmentRecommendation(db, "2026-06-19", {
      equipmentName: "Lake Blue Concept Card",
      equipmentType: "concept_card",
      whyThisEquipment: "A captured tool idea is ready to reuse.",
      sourceBattleInsight: "Could this become a reusable planning tool?",
      minimumViableVersion: "One printable card with prompt fields.",
      expectedBenefit: "Preserves the idea for tomorrow.",
      printPrompt: "Print a lake-blue concept card.",
      state: "recommended"
    });

    expect(created).toMatchObject({
      id: 1,
      analysisDate: "2026-06-19",
      equipmentName: "Lake Blue Concept Card",
      state: "recommended"
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updatedAt).toBe(created.createdAt);

    const updated = updateEquipmentState(db, created.id, "approved");

    expect(updated).toMatchObject({
      id: created.id,
      state: "approved"
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(created.updatedAt)
    );
    expect(getEquipmentItem(db, created.id).state).toBe("approved");
  });
});
