import { describe, expect, it } from "vitest";
import { buildRecipeBook, type ItemSource, type GameData } from "@squire/api/recipe-book";
import {
  CHESTS_FILTER,
  CRAFTED_FILTER,
  SHOPS_FILTER,
  listMaterials,
  materialFilters,
  searchMaterials,
} from "@/lib/materials";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const ids = (list: { item: { id: string } }[]) => list.map((material) => material.item.id);

const source = (id: string, skill: string, level: number): ItemSource => ({
  kind: "activity",
  id,
  name: id,
  icon: "",
  skills: [{ id: skill, name: skill, level }],
  lootType: "main",
  locations: [],
  wear: null,
});

const goldBar = book.recipes.find((recipe) => recipe.id === "smelt_a_gold_bar")!.outputs[0]!;
const bookWithGoldBarAsMaterial = {
  ...book,
  recipes: book.recipes.map((recipe) =>
    recipe.id === "assemble_dynamite" ? { ...recipe, materials: [...recipe.materials, [goldBar]] } : recipe,
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
    expect(listMaterials(book).find((material) => material.item.id === "gold_ore")?.isCrafted).toBe(false);
  });

  it("includes crafted items that other recipes use, marked as crafted", () => {
    const goldBarMaterial = listMaterials(bookWithGoldBarAsMaterial).find(
      (material) => material.item.id === "gold_bar",
    );

    expect(goldBarMaterial?.isCrafted).toBe(true);
  });

  it("leaves out crafted items no recipe uses", () => {
    const materials = ids(listMaterials(book));

    expect(materials).not.toContain("gold_bar");
    expect(materials).not.toContain("dynamite");
    expect(materials).not.toContain("bagel");
  });

  it("sorts materials A–Z by name", () => {
    const names = listMaterials(book).map((material) => material.item.name);

    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
  });

  it("keeps each skill's lowest level across sources, lowest first", () => {
    const ore = listMaterials({
      ...book,
      sources: {
        gold_ore: [source("a", "mining", 40), source("b", "mining", 20), source("c", "foraging", 5)],
      },
    }).find((material) => material.item.id === "gold_ore");

    expect(ore?.skills.map((skill) => [skill.id, skill.level])).toEqual([
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

    expect(materialFilters(materials).map((filter) => filter.id)).toEqual(["foraging", "mining"]);
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

    expect(materialFilters(materials).map((filter) => [filter.id, filter.name])).toEqual([
      ["mining", "mining"],
      [CHESTS_FILTER, "Chests"],
      [SHOPS_FILTER, "Shops"],
    ]);
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
    expect(materialFilters(listMaterials(book)).map((filter) => filter.id)).not.toContain(CRAFTED_FILTER);
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
    }).find((material) => material.item.id === "gold_ore");

    expect(ore?.skills.map((skill) => skill.id)).toEqual(["mining"]);
  });

  it("matches in-game keywords as well as names", () => {
    expect(ids(searchMaterials(materials, "ingredient"))).toContain("salt_crystal");
    expect(ids(searchMaterials(materials, "nugg"))).toContain("gold_nugget");
  });

  it("ignores accents", () => {
    const accented = materials.map((material) =>
      material.item.id === "salt_crystal"
        ? { ...material, item: { ...material.item, name: "Jalapeño salt" } }
        : material,
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
