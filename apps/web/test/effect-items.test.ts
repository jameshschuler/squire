import { describe, expect, it } from "vitest";
import {
  buildRecipeBook,
  type Effect,
  type GameData,
  type ItemSummary,
  type RecipeBook,
} from "@squire/api/recipe-book";
import { effectsFor, effectFilters, searchEffectItems, summarizeEffects, whereItemApplies } from "@/lib/effect-items";
import sample from "../../../fixtures/api/gamedata-sample.json";

const base = buildRecipeBook(sample as unknown as GameData);

const target = (id: string) => ({
  id,
  name: id === "travelling" ? "Travelling" : id.charAt(0).toUpperCase() + id.slice(1),
});
const effect = (stat: string, ...appliesTo: string[]): Effect => ({
  condition: "c",
  scope: null,
  stat,
  normal: "+1%",
  fine: "+2%",
  appliesTo: appliesTo.map(target),
});

function withEffects(book: RecipeBook, effectsById: Record<string, Effect[]>): RecipeBook {
  const name = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, " ");
  const foods = Object.entries(effectsById).map(([id, effects]) => ({
    id,
    name: name(id),
    icon: "",
    quality: "common" as const,
    isCollectible: false,
    keywords: [],
    effects: { steps: 1000, tiers: [], effects },
  }));
  return { ...book, foods: foods.sort((a, b) => a.name.localeCompare(b.name)) };
}

const book = withEffects(base, {
  salt_crystal: [effect("Inventory space", "agility", "mining", "travelling")],
  bagel: [effect("Work efficiency", "agility")],
  dynamite: [effect("Double rewards", "mining"), effect("Bonus experience", "mining")],
});
const ids = (list: { id: string }[]) => list.map((f) => f.id);

describe("effectFilters", () => {
  it("lists the skills foods help, A–Z, with Travelling last", () => {
    expect(effectFilters(book.foods).map((f) => f.name)).toEqual(["Agility", "Mining", "Travelling"]);
  });

  it("has no Travelling filter when no food helps while travelling", () => {
    const foods = withEffects(base, { bagel: [effect("Work efficiency", "agility")] }).foods;
    expect(effectFilters(foods).map((f) => f.id)).toEqual(["agility"]);
  });
});

describe("searchEffectItems", () => {
  const foods = book.foods;

  it("narrows to foods that help a skill", () => {
    expect(ids(searchEffectItems(foods, "", { filter: "mining" }))).toEqual(["dynamite", "salt_crystal"]);
    expect(ids(searchEffectItems(foods, "", { filter: "travelling" }))).toEqual(["salt_crystal"]);
  });

  it("matches names", () => {
    expect(ids(searchEffectItems(foods, "dyna"))).toEqual(["dynamite"]);
    expect(searchEffectItems(foods, "nonsense")).toEqual([]);
  });
});

describe("effectsFor", () => {
  it("returns only the food's effects that help the skill", () => {
    const salt = withEffects(base, {
      salt_crystal: [effect("Work efficiency", "mining"), effect("Double rewards", "agility")],
    }).foods[0]!;
    expect(effectsFor(salt, "mining").map((e) => e.stat)).toEqual(["Work efficiency"]);
  });
});

describe("whereItemApplies", () => {
  const scoped = (...scopes: (string | null)[]) =>
    withEffects(base, {
      bagel: scopes.map((scope) => ({ ...effect("Work efficiency", "agility"), scope })),
    }).foods[0]!;

  it.each([
    [["Foraging", "Foraging", "Fishing"], "Foraging · Fishing"],
    [["Global", "Agility"], "Global"],
    [["Agility", null], "Agility"],
    [[null], "Under certain conditions"],
  ])("sums up %j as %s", (scopes, expected) => {
    expect(whereItemApplies(scoped(...scopes))).toBe(expected);
  });
});

describe("summarizeEffects", () => {
  const withStats = (...stats: string[]) =>
    withEffects(base, { bagel: stats.map((stat) => effect(stat, "agility")) }).foods[0]!;

  it.each([
    [["Work efficiency"], "+1% work efficiency"],
    [["Work efficiency", "Chest finding"], "+1% work efficiency · +1 other effect"],
    [["Work efficiency", "Chest finding", "Double rewards"], "+1% work efficiency · +2 other effects"],
  ])("sums up %j as %s", (stats, expected) => {
    expect(summarizeEffects(withStats(...stats), "agility")).toBe(expected);
  });

  it("is empty when nothing applies to the filter", () => {
    expect(summarizeEffects(withStats("Work efficiency"), "mining")).toBe("");
  });
});

describe("items with no effects", () => {
  const wine: ItemSummary = {
    id: "wine",
    name: "Wine",
    icon: "",
    quality: "common",
    isCollectible: true,
    keywords: [],
    effects: null,
  };

  it("says so where the item applies", () => {
    expect(whereItemApplies(wine)).toBe("No effects");
  });

  it("shows up in search but not under a skill", () => {
    expect(searchEffectItems([wine], "wine")).toEqual([wine]);
    expect(searchEffectItems([wine], "", { filter: "agility" })).toEqual([]);
  });

  it("adds no skill chips", () => {
    expect(effectFilters([wine])).toEqual([]);
  });
});
