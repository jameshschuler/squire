import { describe, expect, it } from "vitest";
import { buildRecipeBook, type Effect, type GameData, type RecipeBook } from "@squire/api/recipe-book";
import { effectsFor, foodFilters, listFoods, searchFoods } from "@/lib/foods";
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
  const add = <T extends { id: string }>(item: T) =>
    effectsById[item.id] ? { ...item, effects: { steps: 1000, effects: effectsById[item.id]! } } : item;
  return {
    ...book,
    recipes: book.recipes.map((r) => ({
      ...r,
      outputs: r.outputs.map(add),
      materials: r.materials.map((slot) => slot.map(add)),
    })),
  };
}

const book = withEffects(base, {
  bagel: [effect("Work efficiency", "agility")],
  dynamite: [effect("Double rewards", "mining"), effect("Bonus experience", "mining")],
  salt_crystal: [effect("Inventory space", "agility", "mining", "travelling")],
});
const ids = (list: { id: string }[]) => list.map((f) => f.id);

describe("listFoods", () => {
  it("lists every item with effects once, outputs and materials, A–Z", () => {
    expect(ids(listFoods(book))).toEqual(["bagel", "dynamite", "salt_crystal"]);
  });

  it("lists nothing when no item has effects", () => {
    expect(listFoods(base)).toEqual([]);
  });
});

describe("foodFilters", () => {
  it("lists the skills foods help, A–Z, with Travelling last", () => {
    expect(foodFilters(listFoods(book)).map((f) => f.name)).toEqual(["Agility", "Mining", "Travelling"]);
  });

  it("has no Travelling filter when no food helps while travelling", () => {
    const foods = listFoods(withEffects(base, { bagel: [effect("Work efficiency", "agility")] }));
    expect(foodFilters(foods).map((f) => f.id)).toEqual(["agility"]);
  });
});

describe("searchFoods", () => {
  const foods = listFoods(book);

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
    const salt = listFoods(
      withEffects(base, {
        salt_crystal: [effect("Work efficiency", "mining"), effect("Double rewards", "agility")],
      }),
    )[0]!;
    expect(effectsFor(salt, "mining").map((e) => e.stat)).toEqual(["Work efficiency"]);
  });
});
