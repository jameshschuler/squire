import {
  TRAVELLING,
  words,
  type Effect,
  type ItemEffects,
  type ItemSummary,
  type RecipeBook,
} from "@squire/api/recipe-book";
import { matchesWords } from "./match";
import { uniqueSkills, type SkillOption } from "./skills";

export type Food = ItemSummary & { effects: ItemEffects };

export function listFoods(book: RecipeBook): Food[] {
  const foods = new Map<string, Food>();
  for (const item of book.recipes.flatMap((r) => [...r.outputs, ...r.materials.flat()])) {
    if (item.effects && !foods.has(item.id)) {
      const { id, name, icon, keywords, effects } = item;
      foods.set(id, { id, name, icon, keywords, effects });
    }
  }
  return [...foods.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function foodFilters(foods: Food[]): SkillOption[] {
  const targets = foods.flatMap((food) => food.effects.effects.flatMap((effect) => effect.appliesTo));
  const skills = uniqueSkills(targets.filter((target) => target.id !== TRAVELLING.id));
  return targets.some((target) => target.id === TRAVELLING.id) ? [...skills, TRAVELLING] : skills;
}

export function effectsFor(food: Food, filter: string): Effect[] {
  return food.effects.effects.filter((effect) => effect.appliesTo.some((target) => target.id === filter));
}

export function searchFoods(foods: Food[], query: string, { filter }: { filter?: string } = {}): Food[] {
  const terms = words(query);
  return foods.filter(
    (food) => (!filter || effectsFor(food, filter).length > 0) && matchesWords(terms, [food.name, ...food.keywords]),
  );
}
