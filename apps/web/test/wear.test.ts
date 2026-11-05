import { describe, expect, it } from "vitest";
import type { ActivitySource, ItemSource } from "@squire/api/recipe-book";
import { itemWear, wearDescription } from "@/lib/wear";

const activity = (name: string, wear: number | null): ActivitySource => ({
  kind: "activity",
  id: name,
  name,
  icon: "",
  skills: [],
  lootType: "collectible",
  locations: [],
  wear,
});

const shop: ItemSource = { kind: "shop", id: "tool_stall", name: "Tool stall", icon: "", locations: [] };

describe("itemWear", () => {
  it.each([
    ["nothing has one", [shop, activity("Treasure hunt", null)], null],
    [
      "one activity has one, without naming it",
      [shop, activity("Cut willow trees", 103_333)],
      { steps: 103_333, from: null },
    ],
    [
      "several have one: the fastest, naming it",
      [activity("Spring bat tracking", 5_000), activity("Treasure hunt", null), activity("Run for your life", 250)],
      { steps: 250, from: "Run for your life" },
    ],
  ])("when %s", (_, sources, expected) => {
    expect(itemWear(sources)).toEqual(expected);
  });
});

describe("wearDescription", () => {
  it.each([
    [null, "Average steps to get one at max work efficiency"],
    ["Run for your life", "Average steps to get one at max work efficiency, from Run for your life"],
  ])("from %s reads %s", (from, expected) => {
    expect(wearDescription({ steps: 250, from })).toBe(expected);
  });
});
