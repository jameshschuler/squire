import { describe, expect, it } from "vitest";
import { buildRecipeBook, type GameData, type ItemSource } from "@jameshschuler/walkscape-sdk";
import { CHESTS_FILTER, SHOPS_FILTER, materialFilters, rawMaterials, searchMaterials } from "@/lib/materials";
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

describe("rawMaterials", () => {
  it("lists recipe materials no recipe makes, each once", () => {
    const materials = ids(rawMaterials(book));
    expect(materials).toContain("gold_ore");
    expect(materials).toContain("salt_crystal");
    expect(materials).not.toContain("gold_bar");
    expect(materials).toHaveLength(new Set(materials).size);
  });

  it("sorts materials A–Z by name", () => {
    const names = rawMaterials(book).map((m) => m.item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps each skill's lowest level across sources, lowest first", () => {
    const ore = rawMaterials({
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
    const materials = rawMaterials({
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
    const materials = rawMaterials({
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

describe("searchMaterials", () => {
  const materials = rawMaterials(book);

  it.each([
    ["gold", ["gold_ore", "gold_nugget"]],
    ["gold o", ["gold_ore"]],
    ["", ids(materials)],
    ["nonsense", []],
  ])("finds %j", (query, expected) => {
    expect(ids(searchMaterials(materials, query)).sort()).toEqual([...expected].sort());
  });

  it("only counts skills from activities that drop the material, not chests or shops", () => {
    const ore = rawMaterials({
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

  it("filters by skill", () => {
    expect(ids(searchMaterials(materials, "", { filter: "mining" }))).toEqual(["gold_ore"]);
  });

  it.each([
    [CHESTS_FILTER, "chest"],
    [SHOPS_FILTER, "shop"],
  ])("filters by %s", (filter, kind) => {
    const sourced = rawMaterials({
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
