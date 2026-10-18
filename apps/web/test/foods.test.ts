import { describe, expect, it } from "vitest";
import { buildRecipeBook, type Effect, type GameData, type RecipeBook } from "@squire/api/recipe-book";
import { effectsFor, foodFilters, searchFoods, whereFoodApplies } from "@/lib/foods";
import sample from "../../../fixtures/api/gamedata-sample.json";

const base = buildRecipeBook(sample as unknown as GameData);

const target = (id: string) => ({
  id,
  name: id === "travelling" ? "Travelling" : id.charAt(0).toUpperCase() + id.slice(1),
});
const effect = (stat: string, ...appliesTo: string[]): Effect => ({
  condition: "c",
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
    keywords: [],
    effects: { steps: 1000, effects },
  }));
  return { ...book, foods: foods.sort((a, b) => a.name.localeCompare(b.name)) };
}

const book = withEffects(base, {
  salt_crystal: [effect("Inventory space", "agility", "mining", "travelling")],
  bagel: [effect("Work efficiency", "agility")],
  dynamite: [effect("Double rewards", "mining"), effect("Bonus experience", "mining")],
});
const ids = (list: { id: string }[]) => list.map((f) => f.id);

describe("foodFilters", () => {
  it("lists the skills foods help, A–Z, with Travelling last", () => {
    expect(foodFilters(book.foods).map((f) => f.name)).toEqual(["Agility", "Mining", "Travelling"]);
  });

  it("has no Travelling filter when no food helps while travelling", () => {
    const foods = withEffects(base, { bagel: [effect("Work efficiency", "agility")] }).foods;
    expect(foodFilters(foods).map((f) => f.id)).toEqual(["agility"]);
  });
});

describe("searchFoods", () => {
  const foods = book.foods;

  it("narrows to foods that help a skill", () => {
    expect(ids(searchFoods(foods, "", { filter: "mining" }))).toEqual(["dynamite", "salt_crystal"]);
    expect(ids(searchFoods(foods, "", { filter: "travelling" }))).toEqual(["salt_crystal"]);
  });

  it("matches names", () => {
    expect(ids(searchFoods(foods, "dyna"))).toEqual(["dynamite"]);
    expect(searchFoods(foods, "nonsense")).toEqual([]);
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

describe("whereFoodApplies", () => {
  const conditioned = (condition: string, stat: string, normal: string): Effect => ({
    condition,
    stat,
    normal,
    fine: normal,
    appliesTo: [],
  });

  it("lists each place the food applies once, in order", () => {
    const [food] = withEffects(base, {
      bagel: [
        conditioned("While doing Foraging", "Double rewards", "+2%"),
        conditioned("While doing Foraging", "Steps required", "-1"),
        conditioned("Global", "Bonus experience", "-4%"),
      ],
    }).foods;
    expect(whereFoodApplies(food!)).toBe("Foraging · Global");
  });
});
