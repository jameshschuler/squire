import { describe, expect, it } from "vitest";
import { buildRecipeBook, type GameData, type ItemSource } from "@jameshschuler/walkscape-sdk";
import { materialSkills, rawMaterials, searchMaterials } from "@/lib/materials";
import sample from "../../../fixtures/api/gamedata-sample.json";

const book = buildRecipeBook(sample as unknown as GameData);
const ids = (list: { item: { id: string } }[]) => list.map((m) => m.item.id);

const source = (activityId: string, skill: string, level: number): ItemSource => ({
  activityId,
  name: activityId,
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

  it("puts materials with a source first, lowest level first, and the rest last A–Z", () => {
    const materials = rawMaterials({
      ...book,
      sources: { salt_crystal: [source("dig", "mining", 30)], gold_ore: [source("mine", "mining", 10)] },
    });
    expect(ids(materials).slice(0, 2)).toEqual(["gold_ore", "salt_crystal"]);
    const unsourced = materials.slice(2).map((m) => m.item.name);
    expect(unsourced).toEqual([...unsourced].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps each skill's lowest level across sources, lowest first", () => {
    const [ore] = rawMaterials({
      ...book,
      sources: {
        gold_ore: [source("a", "mining", 40), source("b", "mining", 20), source("c", "foraging", 5)],
      },
    });
    expect(ore?.skills.map((s) => [s.id, s.level])).toEqual([
      ["foraging", 5],
      ["mining", 20],
    ]);
  });
});

describe("materialSkills", () => {
  it("lists each skill once, A–Z", () => {
    const materials = rawMaterials({
      ...book,
      sources: {
        gold_ore: [source("a", "mining", 1)],
        salt_crystal: [source("b", "mining", 2), source("c", "foraging", 3)],
      },
    });
    expect(materialSkills(materials).map((s) => s.id)).toEqual(["foraging", "mining"]);
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

  it("filters by skill", () => {
    expect(ids(searchMaterials(materials, "", { skill: "mining" }))).toEqual(["gold_ore"]);
  });
});
