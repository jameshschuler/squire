import { describe, expect, it } from "vitest";
import { buildRecipeBook, recipesMaking, recipesUsing, searchRecipes, type GameData } from "../src/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const { recipes } = buildRecipeBook(sample as unknown as GameData);
const byId = (id: string) => recipes.find((r) => r.id === id);
const ids = (list: { id: string }[]) => list.map((r) => r.id);

describe("buildRecipeBook", () => {
  it("lists material alternatives in each slot", () => {
    expect(byId("smelt_a_gold_bar")?.materials).toEqual([
      [
        { id: "gold_nugget", name: "Gold nugget", icon: expect.any(String), amount: 7 },
        { id: "gold_ore", name: "Gold ore", icon: expect.any(String), amount: 2 },
      ],
    ]);
  });

  it("pulls skill levels and the service out of requirements", () => {
    const recipe = byId("smelt_a_gold_bar");
    expect(recipe?.skills).toEqual([{ id: "smithing", name: "Smithing", level: 15 }]);
    expect(recipe?.service?.label).toBe("Forge (basic)");
  });

  it("lists locations that have the required service", () => {
    expect(byId("assemble_dynamite")?.service?.locations.length).toBeGreaterThan(0);
  });

  it("labels keyword-list services with their modifiers", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.recipes[0]!.requirements = [
      {
        type: "service",
        name: "",
        opposite: false,
        requirement: { keywords: ["kitchen", "cursed"], tier: "advanced" },
      },
    ];
    expect(buildRecipeBook(data).recipes.find((r) => r.id === data.recipes[0]!.id)?.service).toEqual({
      label: "Cursed kitchen (advanced)",
      tier: "advanced",
      locations: [],
    });
  });

  describe("service tiers", () => {
    function withForge(serviceTier: string, requiredTier: string) {
      const data = structuredClone(sample) as unknown as GameData;
      data.services = [
        {
          id: "test_forge",
          name: "Test forge",
          icon: "",
          tier: serviceTier,
          serviceType: "crafting",
          keywords: ["forge"],
          relatedSkills: [],
        },
      ];
      data.locations = [
        { id: "testville", name: "Testville", icon: "", faction: "", keywords: [], serviceList: ["test_forge"] },
      ];
      data.recipes = data.recipes.filter((r) => r.id === "smelt_a_gold_bar");
      data.recipes[0]!.requirements = [
        { type: "service", name: null, opposite: false, requirement: { serviceKeyword: "forge", tier: requiredTier } },
      ];
      return buildRecipeBook(data).recipes[0]!.service!.locations.map((l) => l.id);
    }

    it.each([
      ["basic", "basic", ["testville"]],
      ["advanced", "basic", ["testville"]],
      ["advanced", "advanced", ["testville"]],
      ["basic", "advanced", []],
      ["legendary", "legendary", ["testville"]],
      ["legendary", "basic", []],
    ])("a %s service for a %s recipe lists %j", (serviceTier, requiredTier, expected) => {
      expect(withForge(serviceTier, requiredTier)).toEqual(expected);
    });
  });

  it("falls back to a readable name for unknown items", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.items = [];
    expect(buildRecipeBook(data).recipes.find((r) => r.id === "smelt_a_gold_bar")?.outputs[0]?.name).toBe("Gold bar");
  });
});

describe("searchRecipes", () => {
  it.each([
    ["recipe name", "gold bar", "smelt_a_gold_bar"],
    ["name prefix", "dynam", "assemble_dynamite"],
    ["output", "bagel", "bake_a_bagel"],
    ["material", "salt", "assemble_dynamite"],
  ])("matches by %s", (_, query, expected) => {
    expect(ids(searchRecipes(recipes, query))).toContain(expected);
  });

  it("returns nothing when a word doesn't match", () => {
    expect(searchRecipes(recipes, "gold nonsense")).toEqual([]);
  });

  it("returns everything for an empty query, filtered by skill", () => {
    expect(ids(searchRecipes(recipes, "  ", { skill: "smithing" }))).toEqual(["smelt_a_gold_bar"]);
  });

  it("respects the limit", () => {
    expect(searchRecipes(recipes, "", { limit: 1 })).toHaveLength(1);
  });
});

describe("recipesMaking / recipesUsing", () => {
  it("finds recipes that make or use an item", () => {
    expect(ids(recipesMaking(recipes, "gold_bar"))).toEqual(["smelt_a_gold_bar"]);
    expect(ids(recipesUsing(recipes, "salt_crystal"))).toEqual(["assemble_dynamite"]);
    expect(recipesUsing(recipes, "unknown")).toEqual([]);
  });
});
