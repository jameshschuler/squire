import { describe, expect, it } from "vitest";
import { efficiencySummary, formatStatValue, statRows } from "@/lib/gear-stats";

describe("statRows", () => {
  it("lists steps stats first, then the rest A–Z, leaving work efficiency for its own line", () => {
    const rows = statRows([
      { stat: "chestFind", isPercent: true, value: 0.2 },
      { stat: "workEfficiency", isPercent: true, value: 0.3 },
      { stat: "doubleAction", isPercent: true, value: 0.345 },
      { stat: "stepsRequired", isPercent: false, value: -4 },
      { stat: "bonusExperience", isPercent: true, value: 0.05 },
    ]);
    expect(rows).toEqual([
      { key: "stepsRequired:false", label: "Steps required", value: "−4" },
      { key: "doubleAction:true", label: "Double action", value: "+34.5%" },
      { key: "bonusExperience:true", label: "Bonus experience", value: "+5%" },
      { key: "chestFind:true", label: "Chest finding", value: "+20%" },
    ]);
  });
});

describe("statRows keys", () => {
  it("tells percent and flat lines of the same stat apart", () => {
    const rows = statRows([
      { stat: "stepsRequired", isPercent: true, value: -0.05 },
      { stat: "stepsRequired", isPercent: false, value: -2 },
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });
});

describe("formatStatValue", () => {
  it.each([
    [{ stat: "stepsRequired", isPercent: true, value: -0.06 }, "−6%"],
    [{ stat: "inventorySpace", isPercent: false, value: 3 }, "+3"],
    [{ stat: "doubleAction", isPercent: true, value: 0.0125 }, "+1.3%"],
  ] as const)("formats %j as %s", (line, expected) => {
    expect(formatStatValue(line)).toBe(expected);
  });
});

describe("efficiencySummary", () => {
  it("shows the efficiency used, the activity's max and where it comes from", () => {
    expect(efficiencySummary({ used: 0.5, cap: 0.5, gear: 1.11, level: 0.25 })).toBe("+50%/50% (gear 111%, level 25%)");
  });

  it("shows a negative efficiency with its sign", () => {
    expect(efficiencySummary({ used: -0.1, cap: 0.7, gear: -0.1, level: 0 })).toBe("−10%/70% (gear -10%, level 0%)");
  });

  it("leaves out the max when the activity has none", () => {
    expect(efficiencySummary({ used: 0.3, cap: Number.POSITIVE_INFINITY, gear: 0.3, level: 0 })).toBe(
      "+30% (gear 30%, level 0%)",
    );
  });
});
