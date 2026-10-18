import { describe, expect, it } from "vitest";
import { buildRecipeBook, type Effect, type GameData, type RecipeBook } from "@squire/api/recipe-book";
import { effectsFor, effectFilters, searchEffectItems, whereItemApplies } from "@/lib/effect-items";
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
    expect(whereItemApplies(food!)).toBe("Foraging · Global");
  });

  it("keeps a partly known condition as one entry", () => {
    const [food] = withEffects(base, {
      bagel: [
        conditioned("While doing Agility (with other conditions)", "Work efficiency", "+5%"),
        conditioned("Global", "Bonus experience", "+1%"),
      ],
    }).foods;
    expect(whereItemApplies(food!)).toBe("Agility (with other conditions) · Global");
  });
});
