import { describe, expect, it } from "vitest";
import {
  buildRecipeBook,
  recipeBookIcons,
  findItem,
  RECIPE_BOOK_SCHEMA,
  sourceKey,
  lowestSkillLevels,
  findRecipesByOutput,
  findRecipesByMaterial,
  searchActivities,
  searchRecipes,
  words,
  type GameData,
} from "../src/recipe-book/index.js";
import type { ItemDetail, ServiceTier } from "@walkscape-community/data-api-client";
import foodItems from "../../../fixtures/api/foods.json";
import gearItems from "../../../fixtures/api/gear.json";
import lootItems from "../../../fixtures/api/loot.json";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const { recipes } = book;
const byId = (id: string) => recipes.find((r) => r.id === id);
const ids = (list: { id: string }[]) => list.map((r) => r.id);

describe("buildRecipeBook", () => {
  it("stamps the book with its schema version", () => {
    expect(book.schema).toBe(RECIPE_BOOK_SCHEMA);
  });

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
        {
          id: "gold_nugget",
          name: "Gold nugget",
          icon: expect.any(String),
          quality: "common",
          isCollectible: false,
          keywords: ["nugget", "light"],
          amount: 7,
        },
        {
          id: "gold_ore",
          name: "Gold ore",
          icon: expect.any(String),
          quality: "common",
          isCollectible: false,
          keywords: ["ore"],
          amount: 2,
        },
      ],
    ]);
  });

  it("gives items their in-game keywords, each once", () => {
    expect(findItem(book, "bagel")?.keywords).toEqual(["food", "sandwich", "agility"]);
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

  it.each([
    ["crafting", true],
    ["wardrobe", false],
  ] as const)("only lists locations with a crafting service (%s: %s)", (serviceType, listed) => {
    const data = structuredClone(sample) as unknown as GameData;
    const kitchen = data.services.find((s) => s.id === "alight_kitchen_basic")!;
    data.services.push({ ...kitchen, id: "closet_service", serviceType });
    data.locations.push({ ...data.locations[0]!, id: "closet", name: "Closet", serviceList: ["closet_service"] });
    const bagel = buildRecipeBook(data).recipes.find((r) => r.id === "bake_a_bagel")!;
    expect(bagel.service!.locations.some((l) => l.id === "closet")).toBe(listed);
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
});

describe("activities", () => {
  const goldOre = book.activities[0]!;
  function activitiesWith(edit: (data: GameData) => void) {
    const data = structuredClone(sample) as unknown as GameData;
    edit(data);
    return buildRecipeBook(data).activities;
  }
  const needs = (edit: (data: GameData) => void) =>
    activitiesWith(edit)[0]!.needs.map(({ label, level, item }) => ({ label, level, item: item?.id ?? null }));

  it("lists an activity with its level, locations and steps", () => {
    expect(goldOre).toMatchObject({
      id: "mine_gold_ore",
      name: "Mine gold ore",
      icon: "assets/icons/items/materials/ores/gold_ore.png",
      skills: [{ id: "mining", name: "Mining", level: 40 }],
      locations: [{ id: "crown_of_cinders", name: "Crown of Cinders", region: "Wrentmark" }],
      workRequired: 68,
      maxWorkEfficiency: 1.7,
      uses: [],
    });
  });

  it("groups drops by loot type: main loot, then gems, then chests", () => {
    expect(goldOre.drops.map((d) => [d.lootType, ids(d.items)])).toEqual([
      ["main", ["gold_ore"]],
      ["gem", ["rough_wrentmarine", "rough_sun_stone"]],
      ["chestTable", ["mining_chest"]],
    ]);
  });

  it("puts each kind of drop in the same order whatever order the game lists its tables in", () => {
    const [activity] = activitiesWith((data) => {
      data.activities[0]!.tables!.reverse();
    });
    expect(activity!.drops.map((d) => d.lootType)).toEqual(["main", "gem", "chestTable"]);
  });

  it("lists an item once per loot type, even when several tables drop it", () => {
    const [activity] = activitiesWith((data) => {
      data.activities[0]!.tables![0]!.tables.push("mine_gold_ore");
    });
    expect(ids(activity!.drops[0]!.items)).toEqual(["gold_ore"]);
  });

  it("leaves out activities that drop nothing", () => {
    const activities = activitiesWith((data) => {
      data.activities.push({ ...data.activities[0]!, id: "travelling", requirements: null, tables: null });
      data.activities.push({ ...data.activities[0]!, id: "emergency_escape", tables: [] });
    });
    expect(ids(activities)).toEqual(["mine_gold_ore"]);
  });

  it("sorts activities by level, then name", () => {
    const activities = activitiesWith((data) => {
      const [mine] = data.activities;
      data.activities.push(
        { ...mine!, id: "pan_for_gold", name: "Pan for gold" },
        { ...mine!, id: "chip_rocks", name: "Chip rocks", requirements: [] },
      );
    });
    expect(ids(activities)).toEqual(["chip_rocks", "mine_gold_ore", "pan_for_gold"]);
  });

  it("names the gear an activity needs", () => {
    expect(
      needs((data) => {
        data.activities[0]!.requirements!.push(
          {
            type: "keywordWithLevelEquipped",
            name: "",
            opposite: false,
            requirement: { keyword: "light_source", skill: "mining", level: 50 },
          },
          {
            type: "distinctKeywordItemsEquipped",
            name: null,
            opposite: false,
            requirement: { quantity: 3, keywords: ["diving_gear"] },
          },
          {
            type: "distinctKeywordItemsEquipped",
            name: null,
            opposite: false,
            requirement: { quantity: 1, keywords: ["weapon", "shield"] },
          },
          { type: "itemEquipped", name: "", opposite: false, requirement: { item: "gold_bar" } },
          { type: "itemAnywhereWithYou", name: "", opposite: false, requirement: { item: "wheat" } },
          { type: "achievementPoint", name: null, opposite: false, requirement: { isPercentage: false, value: 20 } },
          { type: "achievementPoint", name: null, opposite: false, requirement: { isPercentage: true, value: 50 } },
        );
      }),
    ).toEqual([
      { label: "Pickaxe", level: null, item: null },
      { label: "Light source", level: { id: "mining", name: "Mining", level: 50 }, item: null },
      { label: "3 different diving gear items", level: null, item: null },
      { label: "Weapon or shield", level: null, item: null },
      { label: "Gold bar", level: null, item: "gold_bar" },
      { label: "Wheat with you", level: null, item: "wheat" },
      { label: "20 achievement points", level: null, item: null },
      { label: "50% of achievement points", level: null, item: null },
    ]);
  });

  it("skips requirements a player can't act on: hidden ones, opposites and game history", () => {
    expect(
      needs((data) => {
        data.activities[0]!.requirements = [
          { type: "keywordEquipped", name: "", opposite: true, requirement: { keyword: "light_source" } },
          {
            type: "historyData",
            name: "requirements.singulars.uniques.wraithwaterBankRebuild",
            opposite: false,
            requirement: { category: "actionCompleted", data: "repair_the_bank", value: 1, distinct: false },
          },
        ];
      }),
    ).toEqual([]);
  });

  it("lists the items an activity uses up, with the level a keyword input needs", () => {
    const [activity] = activitiesWith((data) => {
      data.activities[0]!.options = [
        {
          type: "inputActivity",
          inputs: [
            { type: "specific", item: "salt_crystal", quantity: 50, quality: null, isOptional: false },
            {
              type: "keyword",
              keyword: "arrows",
              requirements: [
                {
                  type: "inputKeywordWithLevel",
                  name: "",
                  opposite: false,
                  requirement: { skill: "hunting", level: 30 },
                },
              ],
            },
            { type: "keyword", keyword: "hunting_trap" },
          ],
        },
        { type: "limitedActivity", maxCompletions: 1 },
      ];
    });
    expect(activity!.uses.map(({ label, level, item }) => ({ label, level, item: item?.id ?? null }))).toEqual([
      { label: "50 × Salt crystal", level: null, item: "salt_crystal" },
      { label: "Arrows", level: { id: "hunting", name: "Hunting", level: 30 }, item: null },
      { label: "Hunting trap", level: null, item: null },
    ]);
  });
});

describe("searchActivities", () => {
  const activities = buildRecipeBook(
    (() => {
      const data = structuredClone(sample) as unknown as GameData;
      const [mine] = data.activities;
      data.activities.push({
        ...mine!,
        id: "gold_panning",
        name: "Gold panning",
        relatedSkillsList: ["fishing"],
        requirements: [],
        tables: [{ isPrimary: true, type: [], rollAmount: 1, tables: ["wrentmark_gem_table"] }],
      });
      return data;
    })(),
  ).activities;

  it.each([
    ["activity name", "mine gold", ["mine_gold_ore"]],
    ["name prefix", "pann", ["gold_panning"]],
    ["drop", "wrentmarine", ["gold_panning", "mine_gold_ore"]],
    ["name before drop", "gold", ["gold_panning", "mine_gold_ore"]],
  ])("matches by %s", (_, query, expected) => {
    expect(ids(searchActivities(activities, query))).toEqual(expected);
  });

  it("returns nothing when a word doesn't match", () => {
    expect(searchActivities(activities, "gold nonsense")).toEqual([]);
  });

  it("returns everything for an empty query, filtered by skill", () => {
    expect(ids(searchActivities(activities, "", { skill: "mining" }))).toEqual(["mine_gold_ore"]);
  });
});

describe("findRecipesByOutput / findRecipesByMaterial", () => {
  it("finds recipes that make or use an item", () => {
    expect(ids(findRecipesByOutput(recipes, "gold_bar"))).toEqual(["smelt_a_gold_bar"]);
    expect(ids(findRecipesByMaterial(recipes, "salt_crystal"))).toEqual(["assemble_dynamite"]);
    expect(findRecipesByMaterial(recipes, "unknown")).toEqual([]);
  });
});

describe("recipeBookIcons", () => {
  it("lists every recipe, material, output, activity, drop and source icon once", () => {
    const icons = recipeBookIcons(book);
    const expected = [
      ...recipes.flatMap((r) => [r.icon, ...r.outputs.map((o) => o.icon), ...r.materials.flat().map((m) => m.icon)]),
      ...book.activities.flatMap((a) => [a.icon, ...a.drops.flatMap((d) => d.items.map((i) => i.icon))]),
      ...Object.values(book.sources)
        .flat()
        .map((s) => s.icon),
    ];
    expect(new Set(icons)).toEqual(new Set(expected.filter(Boolean)));
    expect(icons).toHaveLength(new Set(icons).size);
    expect(icons).toContain(book.sources.gold_ore![0]!.icon);
  });

  it("includes the icons of items an activity needs or uses", () => {
    const data = structuredClone(sample) as unknown as GameData;
    const wheat = data.items.find((i) => i.id === "wheat")!;
    wheat.icon = "assets/icons/wheat-only-needed.png";
    data.activities[0]!.requirements!.push({
      type: "itemEquipped",
      name: "",
      opposite: false,
      requirement: { item: "wheat" },
    });
    expect(recipeBookIcons(buildRecipeBook(data))).toContain("assets/icons/wheat-only-needed.png");
  });

  it("skips items without an icon", () => {
    const [recipe] = recipes;
    expect(
      recipeBookIcons({
        schema: RECIPE_BOOK_SCHEMA,
        version: "v",
        recipes: [{ ...recipe!, icon: "", outputs: [], materials: [] }],
        activities: [],
        foods: [],
        loot: [],
        gear: [],
        sources: {},
      }),
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
        kind: "activity",
        id: "mine_gold_ore",
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

  it("covers items only an activity drops", () => {
    expect(book.sources.rough_sun_stone?.map((s) => s.id)).toEqual(["mine_gold_ore"]);
  });

  it("leaves out items nothing in the book links to", () => {
    const sources = withActivity((data) => {
      data.activities = [];
    });
    expect(sources.rough_sun_stone).toBeUndefined();
  });

  it("labels drops from special tables and secondary rolls, main loot first", () => {
    const sources = withActivity((data) => {
      const [main, gem] = data.lootTables;
      gem!.tableRows![0]!.rowItemID = "gold_ore";
      data.activities[0]!.tables!.push({ isPrimary: false, type: [], rollAmount: 1, tables: [main!.id] });
    });
    expect(sources.gold_ore?.map((s) => (s.kind === "activity" ? s.lootType : s.kind))).toEqual([
      "main",
      "secondary",
      "gem",
    ]);
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
    expect(sources.gold_ore?.[0]).toMatchObject({ skills: [{ id: "mining", name: "Mining", level: null }] });
  });

  it("lists a chest that contains the material, with the levels of the activities that drop the chest", () => {
    const sources = withActivity((data) => {
      data.lootTables.find((t) => t.id === "mining_chest_table")!.tableRows![0]!.rowItemID = "salt_crystal";
    });
    expect(sources.salt_crystal).toEqual([
      {
        kind: "chest",
        id: "mining_chest",
        name: "Mining chest",
        icon: expect.any(String),
        skills: [{ id: "mining", name: "Mining", level: 40 }],
      },
    ]);
  });

  it("lists a shop that sells the material, with its location when a location has the shop", () => {
    const sources = withActivity((data) => {
      data.shops[0]!.soldItems.push("salt_crystal");
      data.locations[0]!.buildingList = [data.shops[0]!.id];
    });
    expect(sources.salt_crystal).toEqual([
      {
        kind: "shop",
        id: "granfiddich_tool_stall",
        name: "granfiddich tool stall",
        icon: "",
        locations: [{ id: "azurazera", name: "Azurazera", region: "Jarvonia" }],
      },
    ]);
  });

  it("orders activities first, then shops, then chests", () => {
    const sources = withActivity((data) => {
      data.lootTables.find((t) => t.id === "mining_chest_table")!.tableRows![0]!.rowItemID = "gold_ore";
      data.shops[0]!.soldItems.push("gold_ore");
    });
    expect(sources.gold_ore?.map((s) => s.kind)).toEqual(["activity", "shop", "chest"]);
  });

  it("sorts chests no activity drops after the others, by name", () => {
    const sources = withActivity((data) => {
      const chest = data.items.find((i) => i.id === "mining_chest")!;
      data.items.push(
        { ...chest, id: "chest_of_zeta", name: "Chest of Zeta" },
        { ...chest, id: "chest_of_alpha", name: "Chest of Alpha" },
      );
      data.lootTables.find((t) => t.id === "mining_chest_table")!.tableRows![0]!.rowItemID = "salt_crystal";
    });
    expect(sources.salt_crystal?.map((s) => s.name)).toEqual(["Mining chest", "Chest of Alpha", "Chest of Zeta"]);
  });

  it("gives an activity with no location an empty location list", () => {
    const sources = withActivity((data) => {
      data.locations = data.locations.filter((l) => !l.activityList?.length);
    });
    expect(sources.gold_ore?.[0]).toMatchObject({ locations: [] });
  });
});

describe("findItem", () => {
  it.each([
    ["an output", "gold_bar", "Gold bar"],
    ["a material", "salt_crystal", "Salt crystal"],
    ["a material alternative", "gold_ore", "Gold ore"],
  ])("finds %s", (_, id, name) => {
    expect(findItem(book, id)).toEqual({
      id,
      name,
      icon: expect.any(String),
      quality: "common",
      isCollectible: false,
      keywords: expect.any(Array),
      effects: null,
    });
  });

  it.each([
    ["an activity drop", "rough_sun_stone", "Rough sun stone"],
    ["a chest an activity drops", "mining_chest", "Mining chest"],
  ])("finds %s no recipe or list mentions", (_, id, name) => {
    expect(findItem(book, id)).toMatchObject({ id, name, effects: null });
  });

  it("returns undefined for an item that isn't in any recipe or the food list", () => {
    expect(findItem(book, "unknown")).toBeUndefined();
  });
});

describe("sourceKey", () => {
  it("tells apart an activity's loot types, and other kinds by id", () => {
    const activity = book.sources.gold_ore![0]!;
    expect(sourceKey(activity)).toBe("activity:mine_gold_ore:main");
    expect(sourceKey({ ...activity, lootType: "gem" } as typeof activity)).toBe("activity:mine_gold_ore:gem");
    expect(sourceKey({ kind: "shop", id: "stall", name: "stall", icon: "", locations: [] })).toBe("shop:stall");
  });
});

describe("lowestSkillLevels", () => {
  it("keeps the lowest level per skill, lowest first", () => {
    expect(
      lowestSkillLevels([
        { id: "mining", name: "Mining", level: 40 },
        { id: "mining", name: "Mining", level: 20 },
        { id: "foraging", name: "Foraging", level: 5 },
      ]),
    ).toEqual([
      { id: "foraging", name: "Foraging", level: 5 },
      { id: "mining", name: "Mining", level: 20 },
    ]);
  });

  it("returns nothing for no skills", () => {
    expect(lowestSkillLevels([])).toEqual([]);
  });
});

describe("words", () => {
  it.each([
    ["Smelt a gold bar", ["smelt", "a", "gold", "bar"]],
    ["Pâté en croûte", ["pate", "en", "croute"]],
    ["fish-bone, (cooked)!", ["fish", "bone", "cooked"]],
    ["", []],
    ["  --  ", []],
  ])("splits %j", (text, expected) => {
    expect(words(text)).toEqual(expected);
  });
});

describe("foods", () => {
  const data = structuredClone(sample) as unknown as GameData;
  const known = new Set(data.items.map((i) => i.id));
  data.items.push(...(foodItems as unknown as ItemDetail[]).filter((food) => !known.has(food.id)));
  const withFoods = buildRecipeBook(data);

  it("lists every food in the game data A–Z, including ones no recipe uses", () => {
    const names = withFoods.foods.map((f) => f.name);
    expect(names).toContain("Dried fruit");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(withFoods.foods.every((f) => f.effects)).toBe(true);
  });

  it("finds a food no recipe mentions", () => {
    expect(findItem(withFoods, "dried_fruit")?.effects?.steps).toBe(5000);
  });

  it("includes food icons in the icons to prefetch", () => {
    const driedFruit = withFoods.foods.find((f) => f.id === "dried_fruit")!;
    expect(recipeBookIcons(withFoods)).toContain(driedFruit.icon);
  });
});

describe("loot", () => {
  const data = structuredClone(sample) as unknown as GameData;
  data.items.push(...(lootItems as unknown as ItemDetail[]));
  const withLoot = buildRecipeBook(data);

  it("lists loot items with effects, A–Z", () => {
    expect(withLoot.loot.map((l) => l.name)).toEqual([
      "Absorbing amulet",
      "Adjustable wrench",
      "Birch skis",
      "Bogwood boots",
    ]);
  });

  it("leaves out loot items a recipe makes", () => {
    const crafted = structuredClone(data);
    crafted.recipes[0]!.itemRewards = { birch_skis: 1 };
    expect(buildRecipeBook(crafted).loot.map((l) => l.name)).not.toContain("Birch skis");
  });

  it("keeps each item's tier", () => {
    expect(withLoot.loot.map((l) => l.quality)).toEqual(["epic", "rare", "common", "uncommon"]);
  });

  it("has no tier for an item missing from the game data", () => {
    const missing = structuredClone(data);
    missing.recipes[0]!.itemRewards = { not_in_game_data: 1 };
    const output = buildRecipeBook(missing).recipes[0]!.outputs[0]!;
    expect(output.quality).toBeNull();
  });

  it("lists an achievement points reward as a source, without its threshold", () => {
    expect(withLoot.sources.absorbing_amulet).toEqual([
      { kind: "reward", id: "achievementPoints", name: "Achievement points reward", icon: "" },
    ]);
  });

  it("lists an achievement as a source, after the activities that drop the item", () => {
    const rewarded = structuredClone(data);
    rewarded.achievements[0]!.itemRewards[0]!.id = "gold_ore";
    const sources = buildRecipeBook(rewarded).sources.gold_ore!;
    expect(sources.at(0)?.kind).toBe("activity");
    expect(sources.at(-1)).toEqual({
      kind: "achievement",
      id: "my_back_hurts",
      name: "My Back Hurts",
      icon: "",
    });
  });

  it("names faction reputation rewards, once per item however many levels give it", () => {
    const rewarded = structuredClone(data);
    const level = rewarded.rewards[0]!;
    level.rewardItems[0]!.id = "salt_crystal";
    rewarded.rewards.push({ ...structuredClone(level), id: "reward_progress-jarvonia_lvl_4" });
    expect(buildRecipeBook(rewarded).sources.salt_crystal?.map((s) => s.name)).toEqual(["Faction reputation reward"]);
  });

  it("skips rewards that aren't items", () => {
    const rewarded = structuredClone(data);
    rewarded.rewards[0]!.rewardItems[0]! = {
      ...rewarded.rewards[0]!.rewardItems[0]!,
      type: "pfpOption",
      id: "salt_crystal",
    };
    expect(buildRecipeBook(rewarded).sources.salt_crystal).toBeUndefined();
  });

  it("lists collectibles with the loot", () => {
    const withCollectible = structuredClone(data);
    withCollectible.items.push(...(gearItems as unknown as ItemDetail[]));
    const names = buildRecipeBook(withCollectible).loot.map((l) => l.name);
    expect(names).toContain("Ancient ankh");
    expect(names).toContain("99-year-old wine");
    expect(names).not.toContain("Steel hatchet");
    expect(buildRecipeBook(withCollectible).loot.find((l) => l.id === "ancient_ankh")?.isCollectible).toBe(true);
  });

  it("keeps a collectible with the loot even when a recipe makes it", () => {
    const crafted = structuredClone(data);
    crafted.items.push(...(gearItems as unknown as ItemDetail[]));
    crafted.recipes[0]!.itemRewards = { ancient_ankh: 1 };
    expect(buildRecipeBook(crafted).loot.map((l) => l.id)).toContain("ancient_ankh");
  });

  it("finds a loot item no recipe mentions", () => {
    expect(findItem(withLoot, "adjustable_wrench")?.name).toBe("Adjustable wrench");
  });
});

describe("crafted gear", () => {
  const data = structuredClone(sample) as unknown as GameData;
  data.items.push(...(gearItems as unknown as ItemDetail[]));
  data.recipes[0]!.itemRewards = { steel_hatchet: 1 };
  const withGear = buildRecipeBook(data);

  it("lists crafted items with effects once, in the gear list", () => {
    expect(withGear.gear.map((g) => g.id)).toEqual(["steel_hatchet"]);
  });

  it("finds a crafted item with its tier effects", () => {
    expect(findItem(withGear, "steel_hatchet")?.effects?.tiers).toHaveLength(5);
  });

  it("keeps effects off recipe outputs and materials", () => {
    const items = withGear.recipes.flatMap((r) => [...r.outputs, ...r.materials.flat()]);
    expect(items.some((item) => "effects" in item)).toBe(false);
  });

  it("keeps the effects of a loot item a recipe makes", () => {
    const crafted = structuredClone(data);
    crafted.items.push(...(lootItems as unknown as ItemDetail[]));
    crafted.recipes[1]!.itemRewards = { adjustable_wrench: 1 };
    const book = buildRecipeBook(crafted);
    expect(book.loot.map((l) => l.id)).not.toContain("adjustable_wrench");
    expect(findItem(book, "adjustable_wrench")?.effects?.effects[0]?.stat).toBe("Work efficiency");
  });

  it("gives recipe-only items no effects", () => {
    expect(findItem(withGear, "gold_ore")?.effects).toBeNull();
  });
});
