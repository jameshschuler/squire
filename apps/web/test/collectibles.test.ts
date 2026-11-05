import { describe, expect, it } from "vitest";
import type { ActivitySource, ItemSource, ItemWithEffects } from "@squire/api/recipe-book";
import { bestWear, collectibleLabel, collectionOf, collectionProgress } from "@/lib/collectibles";

const item = (id: string, name: string, isCollectible = true) => ({ id, name, isCollectible }) as ItemWithEffects;

const activity = (id: string, wear: number | null): ActivitySource => ({
  kind: "activity",
  id,
  name: id,
  icon: "",
  skills: [],
  lootType: "collectible",
  locations: [],
  wear,
});

const shop: ItemSource = { kind: "shop", id: "tool_stall", name: "Tool stall", icon: "", locations: [] };

const loot = [item("b", "Bubble bauble"), item("w", "Wrench", false), item("a", "Ancient ankh")];

describe("collectionOf", () => {
  it("lists only collectibles, A–Z, marking the ones owned", () => {
    expect(collectionOf(loot, {}, ["b"]).map(({ item, owned }) => [item.name, owned])).toEqual([
      ["Ancient ankh", false],
      ["Bubble bauble", true],
    ]);
  });

  it("ignores owned ids that aren't collectibles in the game data", () => {
    expect(collectionOf(loot, {}, ["w", "gone"]).filter((entry) => entry.owned)).toEqual([]);
  });

  it("gives each collectible the W.E.A.R. of its fastest source", () => {
    const sources = { a: [activity("slow", 90_000), activity("fast", 40_000)] };

    expect(collectionOf(loot, sources, []).map(({ item, wear }) => [item.id, wear])).toEqual([
      ["a", 40_000],
      ["b", null],
    ]);
  });
});

describe("bestWear", () => {
  it.each([
    ["no sources", [], null],
    ["only sources without one", [shop, activity("treasure_hunt", null)], null],
    ["the lowest one", [activity("slow", 90_000), shop, activity("fast", 40_000)], 40_000],
  ])("returns %s", (_, sources, expected) => {
    expect(bestWear(sources)).toBe(expected);
  });
});

describe("collectibleLabel", () => {
  const ankh = item("a", "Ancient ankh");

  it.each([
    [true, 40_000, "Ancient ankh"],
    [false, 40_000, "Ancient ankh, not found yet, W.E.A.R. 40,000 steps"],
    [false, null, "Ancient ankh, not found yet"],
  ])("owned %s with W.E.A.R. %s reads %s", (owned, wear, expected) => {
    expect(collectibleLabel({ item: ankh, owned, wear })).toBe(expected);
  });
});

describe("collectionProgress", () => {
  it("counts what's found out of the game's total", () => {
    expect(collectionProgress(2, 40)).toBe("2 of 40");
  });
});
