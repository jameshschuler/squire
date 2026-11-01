import { byActivityLevel, byLevel } from "./order.js";
import type { ActivityView, RecipeView, SkillLevel } from "./types.js";

export interface SkillSearchOptions {
  skill?: string;
}

const searchWordsCache = new WeakMap<object, string[][]>();

export function searchRecipes(recipes: RecipeView[], query: string, options: SkillSearchOptions = {}): RecipeView[] {
  return search(recipes, query, options, byLevel, (recipe) => [
    words(recipe.name),
    recipe.outputs.flatMap((output) => words(output.name)),
    recipe.materials.flat().flatMap((material) => words(material.name)),
  ]);
}

export function searchActivities(
  activities: ActivityView[],
  query: string,
  options: SkillSearchOptions = {},
): ActivityView[] {
  return search(activities, query, options, byActivityLevel, (activity) => [
    words(activity.name),
    activity.drops.flatMap((drop) => drop.items.flatMap((item) => words(item.name))),
  ]);
}

export function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function search<T extends { skills: SkillLevel[] }>(
  entries: T[],
  query: string,
  { skill }: SkillSearchOptions,
  order: (a: T, b: T) => number,
  wordGroups: (entry: T) => string[][],
): T[] {
  const pool = skill ? entries.filter((entry) => entry.skills.some((eachSkill) => eachSkill.id === skill)) : entries;
  const terms = words(query);

  if (terms.length === 0) {
    return pool;
  }

  return pool
    .map((entry) => ({ entry, score: searchScore(cachedWordGroups(entry, wordGroups), terms) }))
    .filter((scored) => scored.score > 0)
    .sort((left, right) => right.score - left.score || order(left.entry, right.entry))
    .map((scored) => scored.entry);
}

function cachedWordGroups<T extends object>(entry: T, wordGroups: (entry: T) => string[][]): string[][] {
  let cached = searchWordsCache.get(entry);

  if (!cached) {
    cached = wordGroups(entry);
    searchWordsCache.set(entry, cached);
  }

  return cached;
}

function searchScore(groups: string[][], terms: string[]): number {
  let score = 0;

  for (const term of terms) {
    const index = groups.findIndex((group) => group.some((word) => word.startsWith(term)));

    if (index === -1) {
      return 0;
    }

    score += groups.length - index;
  }

  return (groups[0] ?? []).join(" ").startsWith(terms.join(" ")) ? score + 1 : score;
}
