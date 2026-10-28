import { describe, expect, it } from "vitest";
import { efficiencyRow, efficiencyStatus, formatStatValue, statGroups } from "@/lib/gear-stats";

describe("statGroups", () => {
  const groups = statGroups([
    { stat: "chestFind", isPercent: true, value: 0.4 },
    { stat: "workEfficiency", isPercent: true, value: 0.33 },
    { stat: "stepsRequired", isPercent: true, value: -0.01 },
    { stat: "doubleAction", isPercent: true, value: 0.205 },
    { stat: "stepsRequired", isPercent: false, value: -7 },
    { stat: "bonusExperience", isPercent: true, value: 0.37 },
    { stat: "bonusExperience", isPercent: false, value: 1 },
  ]);

  it("puts steps stats in their own group, leaving work efficiency for its own row", () => {
    expect(groups.steps).toEqual([
      { label: "Steps required", value: "−7 steps, −1%" },
      { label: "Double action", value: "+20.5%" },
    ]);
  });

  it("merges a stat's flat and percent parts into one row, and sorts the rest A–Z", () => {
    expect(groups.other).toEqual([
      { label: "Bonus experience", value: "+1, +37%" },
      { label: "Chest finding", value: "+40%" },
    ]);
  });

  it("has empty groups when the set gives nothing", () => {
    expect(statGroups([])).toEqual({ steps: [], other: [] });
  });
});

describe("formatStatValue", () => {
  it.each([
    [{ stat: "stepsRequired", isPercent: true, value: -0.06 }, "−6%"],
    [{ stat: "stepsRequired", isPercent: false, value: -2 }, "−2 steps"],
    [{ stat: "inventorySpace", isPercent: false, value: 3 }, "+3"],
    [{ stat: "doubleAction", isPercent: true, value: 0.0125 }, "+1.3%"],
  ] as const)("formats %j as %s", (line, expected) => {
    expect(formatStatValue(line)).toBe(expected);
  });
});

describe("efficiencyRow", () => {
  it("shows the efficiency used against the activity's max, with gear and level parts", () => {
    expect(efficiencyRow({ used: 0.5, cap: 0.5, gear: 0.33, level: 0.25 })).toEqual({
      value: "+50% of 50% max",
      detail: "Gear +33% · level +25%",
    });
  });

  it("shows a negative efficiency with its sign", () => {
    expect(efficiencyRow({ used: -0.1, cap: 0.7, gear: -0.1, level: 0 }).value).toBe("−10% of 70% max");
  });

  it("leaves out the max when the activity has none", () => {
    expect(efficiencyRow({ used: 0.3, cap: Number.POSITIVE_INFINITY, gear: 0.3, level: 0 }).value).toBe("+30%");
  });
});

describe("efficiencyStatus", () => {
  it.each([
    [{ used: 0.3, cap: 0.5, gear: 0.05, level: 0.25 }, "Work efficiency 30% of 50% max, 20% short"],
    [{ used: 0.5, cap: 0.5, gear: 0.25, level: 0.25 }, "Max work efficiency reached"],
    [{ used: 0.5, cap: 0.5, gear: 0.58, level: 0.25 }, "Max work efficiency reached, 33% over (wasted)"],
    [{ used: 0.4, cap: Number.POSITIVE_INFINITY, gear: 0.4, level: 0 }, "Work efficiency 40%, no max"],
  ])("describes %j", (parts, expected) => {
    expect(efficiencyStatus(parts)).toBe(expected);
  });
});
