import { TRAVELLING, words, type Effect, type Food } from "@squire/api/recipe-book";
import { formatCondition } from "./format";
import { matchesWords } from "./match";
import { uniqueSkills, type SkillOption } from "./skills";

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

export function whereFoodApplies(food: Food): string {
  return [...new Set(food.effects.effects.map((effect) => effect.condition))].map(formatCondition).join(" · ");
}
