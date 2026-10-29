import { describe, expect, it } from "vitest";
import { formatStatValue, statGroups, type StatTile } from "@/lib/gear-stats";

describe("statGroups", () => {
  const capped = { used: 0.2, cap: 0.2, gear: 0.95, level: 0.25 };
  const steps = { key: "steps", value: "35", label: "Steps", details: [], highlight: true };
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
  const groups = statGroups([...lines], capped, [{ stat: "chestFind", isPercent: true }], steps);
  const shown = (tiles: StatTile[]) => tiles.map((t) => [`${t.label} ${t.value}`, ...t.details].join(" · "));

  it("starts the steps tiles with steps, then work efficiency, then one number per tile", () => {
    expect(shown(groups.steps)).toEqual([
      "Steps 35",
      "Work efficiency +20% · Maxed at 20% · Gear +95%, level +25%",
      "Steps required (flat) −6",
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

  it("says what the work efficiency max is when it isn't maxed", () => {
    const short = statGroups([], { used: 0.3, cap: 0.5, gear: 0.05, level: 0.25 }, [], steps);
    expect(shown(short.steps)).toEqual(["Steps 35", "Work efficiency +30% · Max is 50% · Gear +5%, level +25%"]);
  });

  it("highlights only the exact stat a priority uses, not its flat or percent twin", () => {
    const xp = statGroups([...lines], capped, [{ stat: "bonusExperience", isPercent: true }], steps);
    expect(xp.other.filter((t) => t.highlight).map((t) => t.label)).toEqual(["Bonus XP"]);
  });

  it("lists highlighted stats in priority order, not A–Z", () => {
    const ranked = statGroups(
      [
        { stat: "chestFind", isPercent: true, value: 0.1 },
        { stat: "findGems", isPercent: true, value: 0.2 },
      ],
      capped,
      [
        { stat: "findGems", isPercent: true },
        { stat: "chestFind", isPercent: true },
      ],
      steps,
    );
    expect(ranked.other.map((t) => t.label)).toEqual(["Gem finding", "Chest finding"]);
  });

  it.each([
    [{ used: 0.3, cap: Number.POSITIVE_INFINITY, gear: 0.3, level: 0 }, "Work efficiency +30% · Gear +30%, level +0%"],
    [{ used: -0.1, cap: 0.7, gear: -0.1, level: 0 }, "Work efficiency −10% · Max is 70% · Gear −10%, level +0%"],
  ])("labels the work efficiency tile for %j", (parts, expected) => {
    expect(shown(statGroups([], parts, [], steps).steps)).toEqual(["Steps 35", expected]);
  });

  it("has only the steps and work efficiency tiles when the set gives nothing", () => {
    expect(statGroups([], capped, [], steps)).toMatchObject({
      steps: [{ key: "steps" }, { key: "workEfficiency" }],
      other: [],
    });
  });

  it("shows a highlighted zero for a priority stat the set doesn't give", () => {
    const none = statGroups([], capped, [{ stat: "chestFind", isPercent: true }], steps);
    expect(none.other).toMatchObject([{ label: "Chest finding", value: "+0%", highlight: true }]);
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
