import { describe, expect, it } from "vitest";
import { formatStatValue, locationTiles, statGroups, type StatTile } from "@/lib/gear-stats";

describe("statGroups", () => {
  const capped = { cap: 0.2, gear: 0.95, level: 0.25 };
  const steps = { key: "steps", value: "35", label: "Steps", details: [], highlight: true, over: false };
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

  it("starts the steps tiles with steps, then work efficiency against the max, then one number per tile", () => {
    expect(shown(groups.steps)).toEqual([
      "Steps 35",
      "Work efficiency 220/120%",
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
    [{ cap: 0.2, gear: 0.95, level: 0.25 }, true],
    [{ cap: 0.5, gear: 0.25, level: 0.25 }, false],
    [{ cap: 0.5, gear: 0.05, level: 0.25 }, false],
    [{ cap: Number.POSITIVE_INFINITY, gear: 3, level: 0.25 }, false],
    [{ cap: 0.2, gear: 0, level: 0.3 }, true],
    [{ cap: 0.2, gear: -0.05, level: 0.3 }, true],
    [{ cap: 0.6, gear: 0.35004, level: 0.25 }, false],
  ])("marks work efficiency red only when the shown total is over the shown max (%j)", (parts, over) => {
    expect(statGroups([], parts, [], steps).steps[1]).toMatchObject({ key: "workEfficiency", over });
  });

  it.each([
    [{ cap: 0.6, gear: 0.59, level: 0.25 }, "184/160%"],
    [{ cap: 0.5, gear: 0.445, level: 0.25 }, "169.5/150%"],
    [{ cap: 0.5, gear: -0.1, level: 0.25 }, "115/150%"],
    [{ cap: Number.POSITIVE_INFINITY, gear: 0.3, level: 0 }, "130%"],
    [{ cap: 0.6, gear: 0, level: 0.25 }, "125/160%"],
  ])("shows total work efficiency against the max (%j)", (parts, value) => {
    expect(statGroups([], parts, [], steps).steps[1]?.value).toBe(value);
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

describe("locationTiles", () => {
  it("adds up each stat across the items that give it, naming them", () => {
    expect(
      locationTiles([
        { source: "Royal capesuit", stat: "rollSpecialTable", isPercent: true, value: 0.17 },
        { source: "Royal gloves", stat: "rollSpecialTable", isPercent: true, value: 0.11 },
        { source: "Chrome wool", stat: "doubleAction", isPercent: true, value: 0.05 },
      ]),
    ).toEqual([
      expect.objectContaining({
        label: "Special loot rolls",
        value: "+28%",
        details: ["Royal capesuit, gloves"],
      }),
      expect.objectContaining({ label: "Double action", value: "+5%", details: ["Chrome wool"] }),
    ]);
  });

  it.each([
    [
      ["Merfolk dance corslet", "Merfolk dance bracers", "Merfolk dance skirt"],
      "Merfolk dance corslet, bracers, skirt",
    ],
    [["Royal capesuit", "Chrome wool"], "Royal capesuit, Chrome wool"],
    [["Spectral vest", "Spectral"], "Spectral vest, Spectral"],
    [["Bubble bauble"], "Bubble bauble"],
  ])("names %j as %s", (names, expected) => {
    const tiles = locationTiles(
      names.map((source) => ({ source, stat: "doubleAction", isPercent: true, value: 0.01 })),
    );
    expect(tiles[0]?.details).toEqual([expected]);
  });

  it("leaves out stats it has no name for", () => {
    expect(locationTiles([{ source: "Odd hat", stat: "skillLevel", isPercent: false, value: 1 }])).toEqual([]);
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
