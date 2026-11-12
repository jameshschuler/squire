import { describe, expect, it } from "vitest";
import type { ActivitySource, DropRate, DropRateRange, ItemSource, ItemSummary } from "@squire/api/recipe-book";
import {
  chanceDescription,
  formatChance,
  formatRateSteps,
  fromSource,
  itemRate,
  stepsDescription,
} from "@/lib/drop-rates";

const rate = (chance: number, stepsEach: number | null, baseSteps: number | null = stepsEach): DropRate => ({
  chance,
  stepsEach,
  baseSteps,
});

const activity = (name: string, stepsEach: number | null): ActivitySource => ({
  kind: "activity",
  id: name,
  name,
  icon: "",
  skills: [],
  lootType: "collectible",
  locations: [],
  rate: rate(0.001, stepsEach),
  rateRange: null,
});

const collectible = { isCollectible: true } as ItemSummary;
const material = { isCollectible: false } as ItemSummary;

const shop: ItemSource = { kind: "shop", id: "tool_stall", name: "Tool stall", icon: "", locations: [] };

const lakeTrout: DropRateRange = {
  chance: { min: 0.058, max: 0.405 },
  stepsEach: { min: 116, max: 805 },
  baseSteps: { min: 140, max: 970 },
};

describe("itemRate", () => {
  it.each([
    ["nothing has steps each", [shop, activity("Treasure hunt", null)], null],
    [
      "one activity has them, without naming it",
      [shop, activity("Cut willow trees", 103_333)],
      { rate: rate(0.001, 103_333), range: null, from: null },
    ],
    [
      "several have them: the fastest, naming it",
      [activity("Spring bat tracking", 5_000), activity("Treasure hunt", null), activity("Run for your life", 250)],
      { rate: rate(0.001, 250), range: null, from: "Run for your life" },
    ],
  ])("when %s", (_, sources, expected) => {
    expect(itemRate(collectible, sources)).toEqual(expected);
  });

  it("keeps the fastest activity's range when its rate changes with level", () => {
    const scaling = { ...activity("Lake fishing", 116), rateRange: lakeTrout };

    expect(itemRate(collectible, [scaling])?.range).toEqual(lakeTrout);
  });

  it("is null for a non-collectible, even when an activity has steps each", () => {
    expect(itemRate(material, [activity("Mine gold ore", 40)])).toBeNull();
  });
});

describe("formatChance", () => {
  it.each([
    ["the wiki's chance and odds for Petrified branch", rate(0.0084, 10_000), null, "0.84% · 1 in 119 actions"],
    ["a rare drop to three digits", rate(1 / 16_667, 1_400_000), null, "0.006% · 1 in 16,667 actions"],
    ["a drop on every action", rate(1, 40), null, "Every action"],
    ["every action when it rounds to 100%", rate(0.9996, 40), null, "Every action"],
    ["no odds when they'd round to 1 in 1", rate(0.8, 50), null, "80% of actions"],
    ["ranges when it changes with level", rate(0.405, 116), lakeTrout, "5.8%–40.5% · 1 in 2–17 actions"],
    [
      "no odds range when the top would be 1 in 1",
      rate(0.9, 20),
      { ...lakeTrout, chance: { min: 0.3, max: 0.9 } },
      "30%–90% of actions",
    ],
  ])("shows %s", (_, input, range, expected) => {
    expect(formatChance(input, range)).toBe(expected);
  });
});

describe("formatRateSteps", () => {
  it.each([
    ["steps and base rate", rate(0.0084, 10_000, 11_905), null, "~10,000 steps · 11,905 at base rate"],
    ["ranges when they change with level", rate(0.405, 116, 140), lakeTrout, "~116–805 steps · 140–970 at base rate"],
    ["only the base rate without a max work efficiency", rate(0.01, null, 6_800), null, "~6,800 steps at base rate"],
    ["nothing without work to do", rate(0.01, null, null), null, null],
  ])("shows %s", (_, input, range, expected) => {
    expect(formatRateSteps(input, range)).toBe(expected);
  });
});

describe("descriptions", () => {
  it("say when the rate changes with skill level", () => {
    expect(chanceDescription(null)).toBe("Chance per action of getting at least one");
    expect(chanceDescription(lakeTrout)).toBe("Chance per action of getting at least one. Changes with skill level.");
    expect(stepsDescription(lakeTrout)).toMatch(/at base rate \(no work efficiency\)\. Changes with skill level\.$/);
  });

  it("name the activity when several drop the item", () => {
    expect(fromSource("Chance per action of getting at least one", "Run for your life")).toBe(
      "Chance per action of getting at least one, from Run for your life",
    );
    expect(fromSource("Chance per action of getting at least one", null)).toBe(
      "Chance per action of getting at least one",
    );
  });
});
