import { describe, expect, it } from "vitest";
import {
  buildRecipeBook,
  recipeBookIcons,
  findItem,
  recipesMaking,
  recipesUsing,
  searchRecipes,
  type GameData,
  type ServiceTier,
} from "../src/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const { recipes } = book;
const byId = (id: string) => recipes.find((r) => r.id === id);
const ids = (list: { id: string }[]) => list.map((r) => r.id);

describe("buildRecipeBook", () => {
  it("sorts recipes by level, lowest first", () => {
    expect(ids(recipes)).toEqual(["smelt_a_gold_bar", "bake_a_bagel", "assemble_dynamite"]);
  });

  it("breaks level ties by the name of the item made, not the recipe name", () => {
    const data = structuredClone(sample) as unknown as GameData;
    const [bagel, bar] = [
      data.recipes.find((r) => r.id === "bake_a_bagel")!,
      data.recipes.find((r) => r.id === "smelt_a_gold_bar")!,
    ];
    bar.relatedSkills = bagel.relatedSkills;
    bar.requirements = bagel.requirements;
    bar.name = "Craft a gold bar";
    expect(ids(buildRecipeBook(data).recipes)).toEqual(["bake_a_bagel", "smelt_a_gold_bar", "assemble_dynamite"]);
  });

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

  it("names each location's region from its faction", () => {
    const regions = byId("smelt_a_gold_bar")?.service?.locations.map((l) => [l.name, l.region]);
    expect(regions).toContainEqual(["Bilgemont Port", "Grand Duchy of Trellin-Erdwise"]);
  });

  it("falls back to a readable region name for an unknown faction", () => {
    const data = structuredClone(sample) as unknown as GameData;
    data.factions = [];
    const location = buildRecipeBook(data).recipes.find((r) => r.id === "smelt_a_gold_bar")?.service?.locations[0];
    expect(location?.region).toBe("Grand duchy of trellin erdwise");
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
    function forgeRecipe(requiredTier: ServiceTier, forges: Record<string, ServiceTier[]>) {
      const data = structuredClone(sample) as unknown as GameData;
      data.services = Object.values(forges)
        .flat()
        .map((tier) => ({
          id: `${tier}_forge`,
          name: `${tier} forge`,
          icon: "",
          tier,
          serviceType: "crafting",
          keywords: ["forge"],
          relatedSkills: [],
        }));
      data.locations = Object.entries(forges).map(([id, tiers]) => ({
        id,
        name: id,
        icon: "",
        faction: "jarvonia",
        keywords: [],
        serviceList: tiers.map((tier) => `${tier}_forge`),
      }));
      data.recipes = data.recipes.filter((r) => r.id === "smelt_a_gold_bar");
      data.recipes[0]!.requirements = [
        { type: "service", name: null, opposite: false, requirement: { serviceKeyword: "forge", tier: requiredTier } },
      ];
      return buildRecipeBook(data).recipes[0]!.service!;
    }

    it.each<[ServiceTier, ServiceTier, string[]]>([
      ["basic", "basic", ["town"]],
      ["advanced", "basic", ["town"]],
      ["advanced", "advanced", ["town"]],
      ["basic", "advanced", []],
    ])("a %s forge for a %s recipe lists %j", (serviceTier, requiredTier, expected) => {
      expect(forgeRecipe(requiredTier, { town: [serviceTier] }).locations.map((l) => l.id)).toEqual(expected);
    });

    it("marks each location with the lowest qualifying tier it has", () => {
      const service = forgeRecipe("basic", { both: ["basic", "advanced"], city: ["advanced"] });
      expect(service.locations).toEqual([
        { id: "both", name: "both", region: "Jarvonia", tier: "basic" },
        { id: "city", name: "city", region: "Jarvonia", tier: "advanced" },
      ]);
    });

    it("keeps the label and tier at the recipe's required tier", () => {
      const service = forgeRecipe("basic", { city: ["advanced"] });
      expect(service.label).toBe("Forge (basic)");
      expect(service.tier).toBe("basic");
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

  it("orders equally good matches by level", () => {
    expect(ids(searchRecipes(recipes, "a"))).toEqual(["assemble_dynamite", "smelt_a_gold_bar", "bake_a_bagel"]);
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

describe("recipeBookIcons", () => {
  it("lists every recipe, material, output and source icon once", () => {
    const icons = recipeBookIcons(book);
    const expected = [
      ...recipes.flatMap((r) => [r.icon, ...r.outputs.map((o) => o.icon), ...r.materials.flat().map((m) => m.icon)]),
      ...Object.values(book.sources)
        .flat()
        .map((s) => s.icon),
    ];
    expect(new Set(icons)).toEqual(new Set(expected.filter(Boolean)));
    expect(icons).toHaveLength(new Set(icons).size);
    expect(icons).toContain(book.sources.gold_ore![0]!.icon);
  });

  it("skips items without an icon", () => {
    const [recipe] = recipes;
    expect(
      recipeBookIcons({ version: "v", recipes: [{ ...recipe!, icon: "", outputs: [], materials: [] }], sources: {} }),
    ).toEqual([]);
  });
});

describe("sources", () => {
  function withActivity(edit: (data: GameData) => void) {
    const data = structuredClone(sample) as unknown as GameData;
    edit(data);
    return buildRecipeBook(data).sources;
  }

  it("lists the activity that drops a material, with its level and locations", () => {
    expect(book.sources.gold_ore).toEqual([
      {
        activityId: "mine_gold_ore",
        name: "Mine gold ore",
        icon: expect.any(String),
        skills: [{ id: "mining", name: "Mining", level: 40 }],
        lootType: "main",
        locations: [{ id: "crown_of_cinders", name: "Crown of Cinders", region: "Wrentmark" }],
      },
    ]);
  });

  it("has no entry for a material nothing drops", () => {
    expect(book.sources.salt_crystal).toBeUndefined();
  });

  it("only covers items used as recipe materials", () => {
    expect(book.sources.rough_sun_stone).toBeUndefined();
  });

  it("labels drops from special tables and secondary rolls, main loot first", () => {
    const sources = withActivity((data) => {
      const [main, gem] = data.lootTables;
      gem!.tableRows[0]!.rowItemID = "gold_ore";
      data.activities[0]!.tables!.push({ isPrimary: false, type: [], rollAmount: 1, tables: [main!.id] });
    });
    expect(sources.gold_ore?.map((s) => s.lootType)).toEqual(["main", "gem", "secondary"]);
  });

  it("finds items in sub-tables", () => {
    const sources = withActivity((data) => {
      const main = data.lootTables[0]!;
      main.subTables = [{ type: "uncommon", weight: 1, tableRows: main.tableRows }];
      main.tableRows = [];
    });
    expect(sources.gold_ore).toHaveLength(1);
  });

  it("lists an activity once per loot type, even if several tables drop the item", () => {
    const sources = withActivity((data) => {
      data.activities[0]!.tables![0]!.tables.push(data.lootTables[0]!.id);
    });
    expect(sources.gold_ore).toHaveLength(1);
  });

  it("handles an activity without requirements or loot tables", () => {
    const sources = withActivity((data) => {
      data.activities.push({ ...data.activities[0]!, id: "travelling", requirements: null, tables: null });
      data.activities[0]!.requirements = null;
    });
    expect(sources.gold_ore?.[0]?.skills).toEqual([{ id: "mining", name: "Mining", level: null }]);
  });

  it("gives an activity with no location an empty location list", () => {
    const sources = withActivity((data) => {
      data.locations = data.locations.filter((l) => !l.activityList?.length);
    });
    expect(sources.gold_ore?.[0]?.locations).toEqual([]);
  });
});

describe("findItem", () => {
  it.each([
    ["an output", "gold_bar", "Gold bar"],
    ["a material", "salt_crystal", "Salt crystal"],
    ["a material alternative", "gold_ore", "Gold ore"],
  ])("finds %s", (_, id, name) => {
    expect(findItem(recipes, id)).toEqual({ id, name, icon: expect.any(String) });
  });

  it("returns undefined for an item no recipe mentions", () => {
    expect(findItem(recipes, "unknown")).toBeUndefined();
  });
});
