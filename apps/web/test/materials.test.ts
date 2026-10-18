import { describe, expect, it } from "vitest";
import { buildRecipeBook, type ItemSource, type GameData } from "@squire/api/recipe-book";
import {
  CHESTS_FILTER,
  CRAFTED_FILTER,
  REWARDS_FILTER,
  SHOPS_FILTER,
  listMaterials,
  materialFilters,
  searchMaterials,
} from "@/lib/materials";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const ids = (list: { item: { id: string } }[]) => list.map((m) => m.item.id);

const source = (id: string, skill: string, level: number): ItemSource => ({
  kind: "activity",
  id,
  name: id,
  icon: "",
  skills: [{ id: skill, name: skill, level }],
  lootType: "main",
  locations: [],
});

const goldBar = book.recipes.find((r) => r.id === "smelt_a_gold_bar")!.outputs[0]!;
const bookWithGoldBarAsMaterial = {
  ...book,
  recipes: book.recipes.map((r) =>
    r.id === "assemble_dynamite" ? { ...r, materials: [...r.materials, [goldBar]] } : r,
  ),
};

describe("listMaterials", () => {
  it("lists gathered recipe materials", () => {
    expect(ids(listMaterials(book))).toEqual(expect.arrayContaining(["gold_ore", "salt_crystal"]));
  });

  it("lists each material once", () => {
    const materials = ids(listMaterials(bookWithGoldBarAsMaterial));
    expect(materials).toHaveLength(new Set(materials).size);
  });

  it("doesn't mark gathered materials as crafted", () => {
    expect(listMaterials(book).find((m) => m.item.id === "gold_ore")?.isCrafted).toBe(false);
  });

  it("includes crafted items that other recipes use, marked as crafted", () => {
    const goldBarMaterial = listMaterials(bookWithGoldBarAsMaterial).find((m) => m.item.id === "gold_bar");
    expect(goldBarMaterial?.isCrafted).toBe(true);
  });

  it("leaves out crafted items no recipe uses", () => {
    const materials = ids(listMaterials(book));
    expect(materials).not.toContain("gold_bar");
    expect(materials).not.toContain("dynamite");
    expect(materials).not.toContain("bagel");
  });

  it("sorts materials A–Z by name", () => {
    const names = listMaterials(book).map((m) => m.item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps each skill's lowest level across sources, lowest first", () => {
    const ore = listMaterials({
      ...book,
      sources: {
        gold_ore: [source("a", "mining", 40), source("b", "mining", 20), source("c", "foraging", 5)],
      },
    }).find((m) => m.item.id === "gold_ore");
    expect(ore?.skills.map((s) => [s.id, s.level])).toEqual([
      ["foraging", 5],
      ["mining", 20],
    ]);
  });
});

describe("materialFilters", () => {
  it("lists each skill once, A–Z, with no chest or shop filters when nothing comes from them", () => {
    const materials = listMaterials({
      ...book,
      sources: {
        gold_ore: [source("a", "mining", 1)],
        salt_crystal: [source("b", "mining", 2), source("c", "foraging", 3)],
      },
    });
    expect(materialFilters(materials).map((s) => s.id)).toEqual(["foraging", "mining"]);
  });
});

describe("materialFilters with chests and shops", () => {
  it("adds Chests and Shops after the skills when materials come from them", () => {
    const materials = listMaterials({
      ...book,
      sources: {
        gold_ore: [source("mine", "mining", 1)],
        salt_crystal: [
          { kind: "chest", id: "mining_chest", name: "Mining chest", icon: "", skills: [] },
          { kind: "shop", id: "stall", name: "stall", icon: "", locations: [] },
        ],
      },
    });
    expect(materialFilters(materials).map((f) => [f.id, f.name])).toEqual([
      ["mining", "mining"],
      [CHESTS_FILTER, "Chests"],
      [SHOPS_FILTER, "Shops"],
    ]);
  });
});

describe("materialFilters with rewards", () => {
  const rewarded = (source: ItemSource) => listMaterials({ ...book, sources: { salt_crystal: [source] } });

  it.each([
    ["an achievement", { kind: "achievement", id: "a", name: "A", icon: "" }],
    ["a reward", { kind: "reward", id: "achievementPoints", name: "Achievement points reward", icon: "" }],
  ] as const)("adds Rewards when a material comes from %s, and filters to it", (_, source) => {
    const materials = rewarded(source);
    expect(materialFilters(materials).map((f) => [f.id, f.name])).toContainEqual([REWARDS_FILTER, "Rewards"]);
    expect(ids(searchMaterials(materials, "", { filter: REWARDS_FILTER }))).toEqual(["salt_crystal"]);
  });

  it("leaves out materials that don't come from a reward", () => {
    const materials = listMaterials({
      ...book,
      sources: {
        gold_ore: [source("mine", "mining", 1)],
        salt_crystal: [{ kind: "reward", id: "factionReputation", name: "Faction reputation reward", icon: "" }],
      },
    });
    expect(ids(searchMaterials(materials, "", { filter: REWARDS_FILTER }))).toEqual(["salt_crystal"]);
  });

  it("has no Rewards filter when nothing comes from one", () => {
    expect(materialFilters(listMaterials(book)).map((f) => f.id)).not.toContain(REWARDS_FILTER);
  });
});

describe("materialFilters with crafted materials", () => {
  it("adds Crafted last when a crafted item is used as a material", () => {
    expect(materialFilters(listMaterials(bookWithGoldBarAsMaterial)).at(-1)).toEqual({
      id: CRAFTED_FILTER,
      name: "Crafted",
    });
  });

  it("has no Crafted filter when every material is gathered", () => {
    expect(materialFilters(listMaterials(book)).map((f) => f.id)).not.toContain(CRAFTED_FILTER);
  });
});

describe("searchMaterials", () => {
  const materials = listMaterials(book);

  it.each([
    ["gold", ["gold_ore", "gold_nugget"]],
    ["gold o", ["gold_ore"]],
    ["", ids(materials)],
    ["nonsense", []],
  ])("finds %j", (query, expected) => {
    expect(ids(searchMaterials(materials, query)).sort()).toEqual([...expected].sort());
  });

  it("only counts skills from activities that drop the material, not chests or shops", () => {
    const ore = listMaterials({
      ...book,
      sources: {
        gold_ore: [
          source("mine", "mining", 40),
          {
            kind: "chest",
            id: "agility_chest",
            name: "Agility chest",
            icon: "",
            skills: [{ id: "carpentry", name: "Carpentry", level: 40 }],
          },
          { kind: "shop", id: "stall", name: "Stall", icon: "", locations: [] },
        ],
      },
    }).find((m) => m.item.id === "gold_ore");
    expect(ore?.skills.map((s) => s.id)).toEqual(["mining"]);
  });

  it("matches in-game keywords as well as names", () => {
    expect(ids(searchMaterials(materials, "ingredient"))).toContain("salt_crystal");
    expect(ids(searchMaterials(materials, "nugg"))).toContain("gold_nugget");
  });

  it("ignores accents", () => {
    const accented = materials.map((m) =>
      m.item.id === "salt_crystal" ? { ...m, item: { ...m.item, name: "Jalapeño salt" } } : m,
    );
    expect(ids(searchMaterials(accented, "jalapeno"))).toEqual(["salt_crystal"]);
  });

  it("filters by skill", () => {
    expect(ids(searchMaterials(materials, "", { filter: "mining" }))).toEqual(["gold_ore"]);
  });

  it("filters to crafted materials, and keeps one no activity drops out of skill filters", () => {
    const withGoldBar = listMaterials(bookWithGoldBarAsMaterial);
    expect(ids(searchMaterials(withGoldBar, "", { filter: CRAFTED_FILTER }))).toEqual(["gold_bar"]);
    expect(ids(searchMaterials(withGoldBar, "", { filter: "mining" }))).toEqual(["gold_ore"]);
    expect(ids(searchMaterials(withGoldBar, "gold bar"))).toEqual(["gold_bar"]);
  });

  it.each([
    [CHESTS_FILTER, "chest"],
    [SHOPS_FILTER, "shop"],
  ])("filters by %s", (filter, kind) => {
    const sourced = listMaterials({
      ...book,
      sources: {
        salt_crystal: [
          kind === "chest"
            ? { kind: "chest", id: "c", name: "Chest", icon: "", skills: [] }
            : { kind: "shop", id: "s", name: "shop", icon: "", locations: [] },
        ],
      },
    });
    expect(ids(searchMaterials(sourced, "", { filter }))).toEqual(["salt_crystal"]);
  });
});
