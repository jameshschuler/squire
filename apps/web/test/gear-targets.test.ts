import { describe, expect, it } from "vitest";
import { buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import { gearTargets, optimizeTarget, searchGearTargets } from "@/lib/gear-targets";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const targets = gearTargets(book);
const byKey = (key: string) => targets.find((t) => t.key === key)!;

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
