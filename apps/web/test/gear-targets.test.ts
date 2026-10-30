import { describe, expect, it } from "vitest";
import { buildRecipeBook, type GameData, type LocationSummary } from "@squire/api/recipe-book";
import {
  gearTargets,
  goalsFor,
  locationLabel,
  optimizeTarget,
  tieBreakersFor,
  recommendedGoals,
  searchGearTargets,
  type GearTarget,
} from "@/lib/gear-targets";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const targets = gearTargets(book);
const byKey = (key: string) => targets.find((t) => t.key === key)!;
const findGold = () => ({ ...book.recipes.find((r) => r.id === "smelt_a_gold_bar")!.outputs[0]!, effects: null });

describe("gearTargets", () => {
  it("offers activities and recipes with steps, A–Z", () => {
    expect(targets.map((t) => t.key)).toEqual([
      "recipe:assemble_dynamite",
      "recipe:bake_a_bagel",
      "activity:mine_gold_ore",
      "recipe:smelt_a_gold_bar",
    ]);
  });

  it("uses an activity's locations and a recipe's service locations", () => {
    expect(byKey("activity:mine_gold_ore").locations.map((l) => l.id)).toEqual(["crown_of_cinders"]);
    expect(byKey("recipe:smelt_a_gold_bar").locations.length).toBeGreaterThan(0);
  });

  it("leaves out recipes without steps", () => {
    const noSteps = { ...book, recipes: book.recipes.map((r) => ({ ...r, workRequired: null })) };
    expect(gearTargets(noSteps).map((t) => t.key)).toEqual(["activity:mine_gold_ore"]);
  });
});

describe("searchGearTargets", () => {
  it("matches names by word prefix", () => {
    expect(searchGearTargets(targets, "gold").map((t) => t.key)).toEqual([
      "activity:mine_gold_ore",
      "recipe:smelt_a_gold_bar",
    ]);
  });

  it("suggests nothing until something is typed", () => {
    expect(searchGearTargets(targets, "  ")).toEqual([]);
  });
});

describe("optimizeTarget", () => {
  const gold = byKey("activity:mine_gold_ore");

  it("takes the skill, level and work from the target", () => {
    expect(optimizeTarget(gold, undefined)).toEqual({
      skill: "mining",
      level: 40,
      workRequired: 68,
      maxWorkEfficiency: 1.7,
      locationIds: ["crown_of_cinders"],
    });
  });

  it("pins a chosen location, and tries them all for any other answer", () => {
    expect(optimizeTarget(gold, "crown_of_cinders").locationIds).toEqual(["crown_of_cinders"]);
    expect(optimizeTarget(gold, "best").locationIds).toEqual(["crown_of_cinders"]);
  });
});

describe("goalsFor", () => {
  it("offers loot goals only when the activity drops that loot, and crafting goals only for recipes", () => {
    expect(goalsFor(byKey("activity:mine_gold_ore")).map((g) => g.id)).toEqual([
      "steps",
      "items",
      "xp",
      "chests",
      "fine",
      "gems",
    ]);
    expect(goalsFor(byKey("recipe:bake_a_bagel")).map((g) => g.id)).toEqual(["steps", "items", "xp", "materials"]);
  });
});

describe("recommendedGoals", () => {
  it("recommends speed, items and chests for an activity with chests", () => {
    expect(recommendedGoals(byKey("activity:mine_gold_ore"))).toEqual(["steps", "items", "chests"]);
  });

  it("recommends XP instead of chests when the activity has none", () => {
    const noChests = { ...byKey("activity:mine_gold_ore"), lootTypes: [] };
    expect(recommendedGoals(noChests)).toEqual(["steps", "items", "xp"]);
  });

  it("recommends speed, saving materials and XP for a recipe that makes no tiered gear", () => {
    expect(recommendedGoals(byKey("recipe:bake_a_bagel"))).toEqual(["steps", "materials", "xp"]);
  });

  it("offers and recommends best quality for a recipe that makes tiered gear", () => {
    const tiered = { ...byKey("recipe:smelt_a_gold_bar"), makesTieredGear: true };
    expect(goalsFor(tiered).map((g) => g.id)).toContain("quality");
    expect(recommendedGoals(tiered)).toEqual(["steps", "materials", "quality"]);
  });

  it("knows which recipes make tiered gear", () => {
    const withGear = {
      ...book,
      gear: [
        { ...findGold(), effects: { steps: null, effects: [], tiers: [{ quality: "rare" as const, effects: [] }] } },
      ],
    };
    const smelt = gearTargets(withGear).find((t) => t.key === "recipe:smelt_a_gold_bar")!;
    expect(smelt.makesTieredGear).toBe(true);
    expect(byKey("recipe:smelt_a_gold_bar").makesTieredGear).toBe(false);
  });
});

describe("tieBreakersFor", () => {
  const activity = {
    kind: "activity",
    lootTypes: ["main", "chestTable"],
    makesTieredGear: false,
  } as unknown as GearTarget;

  it.each([
    [["steps"], ["items", "chests"]],
    [["xp"], ["steps", "items"]],
    [["chests", "steps"], ["items"]],
    [["steps", "items", "chests"], []],
  ] as const)("fills %j up to three priorities with %j", (goals, expected) => {
    expect(tieBreakersFor(activity, [...goals])).toEqual(expected);
  });
});

describe("locationLabel", () => {
  const harbour: LocationSummary = { id: "harbour", name: "Blackspell Harbour", region: "Jarvonia" };
  const vastalume: LocationSummary = { id: "vastalume", name: "Vastalume", region: "Syrenthia" };
  const target = { locations: [harbour, vastalume] } as GearTarget;

  it.each([
    ["harbour", vastalume, "Blackspell Harbour"],
    ["best", vastalume, "Best location: Vastalume"],
    ["best", null, "Best location"],
  ] as const)("labels %s with best-at %j as %s", (location, bestAt, expected) => {
    expect(locationLabel(target, location, bestAt)).toBe(expected);
  });
});
