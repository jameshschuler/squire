import { describe, expect, it } from "vitest";
import { efficiencyStatus, formatStatValue, statGroups } from "@/lib/gear-stats";

describe("statGroups", () => {
  const capped = { used: 0.2, cap: 0.2, gear: 0.95, level: 0.25 };
  const lines = [
    { stat: "chestFind", isPercent: true, value: 0.69 },
    { stat: "workEfficiency", isPercent: true, value: 0.95 },
    { stat: "stepsRequired", isPercent: true, value: -0.02 },
    { stat: "doubleAction", isPercent: true, value: 0.235 },
    { stat: "stepsRequired", isPercent: false, value: -6 },
    { stat: "bonusExperience", isPercent: true, value: 0.03 },
    { stat: "bonusExperience", isPercent: false, value: 4 },
    { stat: "inventorySpace", isPercent: false, value: 3 },
  ] as const;
  const groups = statGroups([...lines], capped, ["chestFind"]);
  const shown = (tiles: { label: string; value: string }[]) => tiles.map((t) => `${t.label} ${t.value}`);

  it("starts the steps tiles with work efficiency, then one number per tile", () => {
    expect(shown(groups.steps)).toEqual([
      "Work efficiency, maxed · gear +95%, level +25% +20%",
      "Steps per action −6",
      "Steps required −2%",
      "Double action +23.5%",
    ]);
  });

  it("puts priority stats first in other bonuses, highlighted, then the rest A–Z", () => {
    expect(shown(groups.other)).toEqual([
      "Chest finding +69%",
      "Bonus XP +3%",
      "Bonus XP per action +4",
      "Inventory space +3",
    ]);
    expect(groups.other.filter((t) => t.highlight).map((t) => t.label)).toEqual(["Chest finding"]);
  });

  it("says how far work efficiency is from the max when it isn't maxed", () => {
    const short = statGroups([], { used: 0.3, cap: 0.5, gear: 0.05, level: 0.25 }, []);
    expect(shown(short.steps)).toEqual(["Work efficiency of 50% max · gear +5%, level +25% +30%"]);
  });

  it("lists highlighted stats in priority order, not A–Z", () => {
    const ranked = statGroups(
      [
        { stat: "chestFind", isPercent: true, value: 0.1 },
        { stat: "findGems", isPercent: true, value: 0.2 },
      ],
      capped,
      ["findGems", "chestFind"],
    );
    expect(ranked.other.map((t) => t.label)).toEqual(["Gem finding", "Chest finding"]);
  });

  it.each([
    [{ used: 0.3, cap: Number.POSITIVE_INFINITY, gear: 0.3, level: 0 }, "Work efficiency · gear +30%, level +0% +30%"],
    [{ used: -0.1, cap: 0.7, gear: -0.1, level: 0 }, "Work efficiency of 70% max · gear −10%, level +0% −10%"],
  ])("labels the work efficiency tile for %j", (parts, expected) => {
    expect(shown(statGroups([], parts, []).steps)).toEqual([expected]);
  });

  it("has only the work efficiency tile when the set gives nothing", () => {
    expect(statGroups([], capped, [])).toMatchObject({ steps: [{ key: "workEfficiency" }], other: [] });
  });
});

describe("formatStatValue", () => {
  it.each([
    [{ stat: "stepsRequired", isPercent: true, value: -0.06 }, "−6%"],
    [{ stat: "stepsRequired", isPercent: false, value: -2 }, "−2"],
    [{ stat: "inventorySpace", isPercent: false, value: 3 }, "+3"],
    [{ stat: "doubleAction", isPercent: true, value: 0.0125 }, "+1.3%"],
  ] as const)("formats %j as %s", (line, expected) => {
    expect(formatStatValue(line)).toBe(expected);
  });
});

describe("efficiencyStatus", () => {
  it.each([
    [{ used: 0.3, cap: 0.5, gear: 0.05, level: 0.25 }, "Work efficiency 30% of 50% max, 20% short"],
    [{ used: 0.5, cap: 0.5, gear: 0.25, level: 0.25 }, "Work efficiency maxed"],
    [{ used: 0.5, cap: 0.5, gear: 0.58, level: 0.25 }, "Work efficiency maxed, 33% over"],
    [{ used: 0.4, cap: Number.POSITIVE_INFINITY, gear: 0.4, level: 0 }, "Work efficiency 40%, no max"],
  ])("describes %j", (parts, expected) => {
    expect(efficiencyStatus(parts)).toBe(expected);
  });
});
