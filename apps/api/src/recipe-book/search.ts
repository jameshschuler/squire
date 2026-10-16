import { byLevel } from "./order.js";
import type { RecipeView } from "./types.js";

export interface RecipeSearchOptions {
  skill?: string;
}

interface SearchWords {
  name: string[];
  outputs: string[];
  materials: string[];
}

const searchWordsCache = new WeakMap<RecipeView, SearchWords>();

export function searchRecipes(recipes: RecipeView[], query: string, options: RecipeSearchOptions = {}): RecipeView[] {
  const pool = options.skill ? recipes.filter((r) => r.skills.some((s) => s.id === options.skill)) : recipes;
  const terms = words(query);
  if (terms.length === 0) {
    return pool;
  }
  return pool
    .map((recipe) => ({ recipe, score: searchScore(recipe, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byLevel(a.recipe, b.recipe))
    .map((s) => s.recipe);
}

export function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function searchWords(recipe: RecipeView): SearchWords {
  let cached = searchWordsCache.get(recipe);
  if (!cached) {
    cached = {
      name: words(recipe.name),
      outputs: recipe.outputs.flatMap((o) => words(o.name)),
      materials: recipe.materials.flat().flatMap((m) => words(m.name)),
    };
    searchWordsCache.set(recipe, cached);
  }
  return cached;
}

function searchScore(recipe: RecipeView, terms: string[]): number {
  const { name, outputs, materials } = searchWords(recipe);
  let score = 0;
  for (const term of terms) {
    const termScore = hits(name, term) ? 3 : hits(outputs, term) ? 2 : hits(materials, term) ? 1 : 0;
    if (termScore === 0) {
      return 0;
    }
    score += termScore;
  }
  return name.join(" ").startsWith(terms.join(" ")) ? score + 1 : score;
}

function hits(haystack: string[], term: string): boolean {
  return haystack.some((w) => w.startsWith(term));
}
