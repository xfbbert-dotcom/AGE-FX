import { describe, expect, it } from "vitest";
import { previousLocalIsoDate, msUntilNextLocalMidnight } from "../src/settlement/dailySettlement.js";

describe("daily AGE settlement", () => {
  it("settles the calendar day that just ended at local midnight", () => {
    const justAfterMidnight = new Date(2026, 5, 21, 0, 0, 1);

    expect(previousLocalIsoDate(justAfterMidnight)).toBe("2026-06-20");
  });

  it("computes the delay until the next local midnight", () => {
    const noon = new Date(2026, 5, 20, 12, 0, 0);

    expect(msUntilNextLocalMidnight(noon)).toBe(12 * 60 * 60 * 1000);
  });
});
