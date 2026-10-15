import type { GameData } from "./gamedata.js";
import {
  SERVICE_TIERS,
  type Item,
  type Requirement,
  type ServiceRequirement,
  type ServiceTier,
  type SkillLevelRequirement,
} from "./types.js";

/** An item and how many of it a recipe takes or makes. */
export interface RecipeItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
}

export interface RecipeLocation {
  id: string;
  name: string;
  /** The lowest service tier here that qualifies. Higher than the recipe's tier means only a better service is available. */
  tier: ServiceTier;
}

/** The crafting service a recipe needs and where to find one. Higher tiers and cursed services also qualify. */
export interface RecipeService {
  /** Display name, e.g. "Kitchen (basic)" or "Cursed kitchen (advanced)". */
  label: string;
  tier: ServiceTier;
  locations: RecipeLocation[];
}

/** A recipe with names and icons resolved, ready to display. */
export interface RecipeView {
  id: string;
  name: string;
  icon: string;
  /** Skills the recipe trains, with the level it needs (`null` when it needs none). */
  skills: { id: string; name: string; level: number | null }[];
  /** `null` when the recipe needs no crafting service. */
  service: RecipeService | null;
  /** One entry per material slot. Each slot takes any one of its options, e.g. 7 gold nuggets or 2 gold ore. */
  materials: RecipeItem[][];
  outputs: RecipeItem[];
  xp: { skill: string; amount: number }[];
  /** Base steps per craft at 100% work efficiency. */
  workRequired: number;
  /** Highest work efficiency that counts for this recipe, as a ratio (1.5 is 150%). */
  maxWorkEfficiency: number;
}

/** Every recipe, sorted by level, tagged with the game data version it came from. */
export interface RecipeBook {
  version: string;
  recipes: RecipeView[];
}

export interface SearchOptions {
  /** Only recipes that train this skill id, e.g. `"cooking"`. */
  skill?: string;
  /** Return at most this many recipes. */
  limit?: number;
}

/**
 * Turns raw game data into display-ready recipes, sorted by level (lowest first), then by the name
 * of the item made.
 */
export function buildRecipeBook(data: GameData): RecipeBook {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const skillNames = new Map(data.skills.map((s) => [s.id, s.name]));
  const skillName = (id: string) => skillNames.get(id) ?? humanize(id);
  const item = (id: string, amount: number): RecipeItem => {
    const found = items.get(id);
    return { id, name: found?.name ?? humanize(id), icon: found?.icon ?? "", amount };
  };

  const recipes = data.recipes.map((recipe): RecipeView => {
    const levels = new Map(
      recipe.requirements.filter(isSkillLevel).map((r) => [r.requirement.skill, r.requirement.level]),
    );
    const service = recipe.requirements.find(isService);
    return {
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      skills: recipe.relatedSkills.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null })),
      service: service ? serviceView(service, data) : null,
      materials: recipe.materials.map((m) => m.options.map((o) => item(o.item, o.amount))),
      outputs: Object.entries(recipe.itemRewards).map(([id, amount]) => item(id, amount)),
      xp: Object.entries(recipe.xpRewards).map(([skill, amount]) => ({ skill: skillName(skill), amount })),
      workRequired: recipe.workRequired,
      maxWorkEfficiency: recipe.maxWorkEfficiency,
    };
  });

  return { version: data.version, recipes: recipes.sort(byLevel) };
}

/**
 * Recipes where every word of `query` starts a word in the recipe name, an output or a material.
 * Name matches rank first, then outputs, then materials; ties keep level order. An empty query
 * returns every recipe in level order.
 */
export function searchRecipes(recipes: RecipeView[], query: string, options: SearchOptions = {}): RecipeView[] {
  const pool = options.skill ? recipes.filter((r) => r.skills.some((s) => s.id === options.skill)) : recipes;
  const terms = words(query);
  if (terms.length === 0) {
    return pool.slice(0, options.limit);
  }

  const scored = pool
    .map((recipe) => ({ recipe, score: searchScore(recipe, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byLevel(a.recipe, b.recipe));
  return scored.map((s) => s.recipe).slice(0, options.limit);
}

/** Recipes that produce an item. */
export function recipesMaking(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.outputs.some((o) => o.id === itemId));
}

/** Every icon path a set of recipes shows (recipes, materials and outputs), each once. Handy for prefetching. */
export function recipeBookIcons(recipes: RecipeView[]): string[] {
  const items = recipes.flatMap((r) => [r, ...r.outputs, ...r.materials.flat()]);
  return [...new Set(items.map((i) => i.icon).filter(Boolean))];
}

/** An item's name and icon, found from any recipe that makes or uses it. */
export function findItem(recipes: RecipeView[], itemId: string): Item | undefined {
  for (const recipe of recipes) {
    const found = [...recipe.outputs, ...recipe.materials.flat()].find((i) => i.id === itemId);
    if (found) {
      return { id: found.id, name: found.name, icon: found.icon };
    }
  }
  return undefined;
}

/** Recipes that take an item as a material, in any slot or option. */
export function recipesUsing(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.some((m) => m.id === itemId)));
}

function byLevel(a: RecipeView, b: RecipeView): number {
  return recipeLevel(a) - recipeLevel(b) || sortName(a).localeCompare(sortName(b)) || a.name.localeCompare(b.name);
}

function recipeLevel(recipe: RecipeView): number {
  return Math.min(...recipe.skills.map((s) => s.level ?? 0));
}

function sortName(recipe: RecipeView): string {
  return recipe.outputs[0]?.name ?? recipe.name;
}

function searchScore(recipe: RecipeView, terms: string[]): number {
  const name = words(recipe.name);
  const outputs = recipe.outputs.flatMap((o) => words(o.name));
  const materials = recipe.materials.flat().flatMap((m) => words(m.name));
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

function serviceView(req: ServiceRequirement, data: GameData): RecipeService {
  const { serviceKeyword, keywords: listed, tier } = req.requirement;
  const keywords = listed?.length ? listed : serviceKeyword ? [serviceKeyword] : [];
  const serviceTiers = new Map(
    data.services
      .filter((s) => meetsTier(s.tier, tier) && keywords.every((k) => s.keywords.includes(k)))
      .map((s) => [s.id, s.tier]),
  );
  const locations = data.locations
    .flatMap((l): RecipeLocation[] => {
      const tiers = (l.serviceList ?? []).flatMap((id) => serviceTiers.get(id) ?? []);
      return tiers.length > 0 ? [{ id: l.id, name: l.name, tier: lowestTier(tiers) }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const [primary = "service", ...modifiers] = keywords;
  return { label: `${humanize([...modifiers, primary].join(" "))} (${tier})`, tier, locations };
}

function meetsTier(serviceTier: ServiceTier, requiredTier: ServiceTier): boolean {
  return SERVICE_TIERS.indexOf(serviceTier) >= SERVICE_TIERS.indexOf(requiredTier);
}

function lowestTier(tiers: ServiceTier[]): ServiceTier {
  return tiers.reduce((low, t) => (SERVICE_TIERS.indexOf(t) < SERVICE_TIERS.indexOf(low) ? t : low));
}

function isSkillLevel(req: Requirement): req is SkillLevelRequirement {
  return req.type === "skillLevel";
}

function isService(req: Requirement): req is ServiceRequirement {
  return req.type === "service";
}

function hits(haystack: string[], term: string): boolean {
  return haystack.some((w) => w.startsWith(term));
}

function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function humanize(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
