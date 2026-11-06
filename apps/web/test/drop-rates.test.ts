import { describe, expect, it } from "vitest";
import type { ActivityDrop, ActivitySource, ItemSource, ItemSummary } from "@squire/api/recipe-book";
import { dropStepsDescription, formatDropSteps, itemSteps, itemStepsDescription } from "@/lib/drop-rates";

const activity = (name: string, stepsEach: number | null): ActivitySource => ({
  kind: "activity",
  id: name,
  name,
  icon: "",
  skills: [],
  lootType: "collectible",
  locations: [],
  stepsEach,
});

const collectible = { isCollectible: true } as ItemSummary;
const material = { isCollectible: false } as ItemSummary;

const shop: ItemSource = { kind: "shop", id: "tool_stall", name: "Tool stall", icon: "", locations: [] };

describe("itemSteps", () => {
  it.each([
    ["nothing has steps each", [shop, activity("Treasure hunt", null)], null],
    [
      "one activity has them, without naming it",
      [shop, activity("Cut willow trees", 103_333)],
      { steps: 103_333, from: null },
    ],
    [
      "several have them: the fastest, naming it",
      [activity("Spring bat tracking", 5_000), activity("Treasure hunt", null), activity("Run for your life", 250)],
      { steps: 250, from: "Run for your life" },
    ],
  ])("when %s", (_, sources, expected) => {
    expect(itemSteps(collectible, sources)).toEqual(expected);
  });

  it("is null for a non-collectible, even when an activity has steps each", () => {
    expect(itemSteps(material, [activity("Mine gold ore", 40)])).toBeNull();
  });
});

describe("itemStepsDescription", () => {
  it.each([
    [null, "Average steps to get one at max work efficiency"],
    ["Run for your life", "Average steps to get one at max work efficiency, from Run for your life"],
  ])("from %s reads %s", (from, expected) => {
    expect(itemStepsDescription({ steps: 250, from })).toBe(expected);
  });
});

describe("formatDropSteps", () => {
  const drop = (stepsEach: number | null, stepsRange: ActivityDrop["stepsRange"] = null) =>
    ({ stepsEach, stepsRange }) as ActivityDrop;

  it.each([
    ["one number", drop(103_333), "~103,333 steps on average"],
    ["a range when it changes with level", drop(116, { min: 116, max: 805 }), "~116–805 steps on average"],
    ["nothing without an average", drop(null), null],
  ])("shows %s", (_, input, expected) => {
    expect(formatDropSteps(input)).toBe(expected);
  });

  it("explains the full rate only for a range", () => {
    expect(dropStepsDescription(drop(40))).toBe("Average steps to get one at max work efficiency");
    expect(dropStepsDescription(drop(145, { min: 47, max: 145 }))).toBe(
      "Average steps to get one at max work efficiency. Changes with skill level: 145 steps once every drop here is at its full rate.",
    );
  });
});
