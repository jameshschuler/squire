import type { GameData } from "./gamedata.js";
import type { Recipe, Requirement, ServiceRequirement, SkillLevelRequirement } from "./types.js";

export interface RecipeItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
}

export interface RecipeService {
  label: string;
  tier: string;
  locations: { id: string; name: string }[];
}

export interface RecipeView {
  id: string;
  name: string;
  icon: string;
  skills: { id: string; name: string; level: number | null }[];
  service: RecipeService | null;
  materials: RecipeItem[][];
  outputs: RecipeItem[];
  xp: { skill: string; amount: number }[];
  workRequired: number;
  maxWorkEfficiency: number;
}

export interface RecipeBook {
  version: string;
  recipes: RecipeView[];
}

export interface SearchOptions {
  skill?: string;
  limit?: number;
}

export function buildRecipeBook(data: GameData): RecipeBook {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const skillNames = new Map(data.skills.map((s) => [s.id, s.name]));
  const skillName = (id: string) => skillNames.get(id) ?? humanize(id);
  const item = (id: string, amount: number): RecipeItem => {
    const found = items.get(id);
    return { id, name: found?.name ?? humanize(id), icon: found?.icon ?? "", amount };
  };

  const recipes = data.recipes.map((recipe): RecipeView => {
    const levels = new Map(recipe.requirements.filter(isSkillLevel).map((r) => [r.requirement.skill, r.requirement.level]));
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

  return { version: data.version, recipes: recipes.sort((a, b) => a.name.localeCompare(b.name)) };
}

export function searchRecipes(recipes: RecipeView[], query: string, options: SearchOptions = {}): RecipeView[] {
  const pool = options.skill ? recipes.filter((r) => r.skills.some((s) => s.id === options.skill)) : recipes;
  const terms = words(query);
  if (terms.length === 0) {
    return pool.slice(0, options.limit);
  }

  const scored = pool
    .map((recipe) => ({ recipe, score: searchScore(recipe, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name));
  return scored.map((s) => s.recipe).slice(0, options.limit);
}

export function recipesMaking(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.outputs.some((o) => o.id === itemId));
}

export function recipesUsing(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.some((m) => m.id === itemId)));
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
  const serviceIds = new Set(
    data.services
      .filter((s) => s.tier === tier && keywords.every((k) => s.keywords.includes(k)))
      .map((s) => s.id),
  );
  const locations = data.locations
    .filter((l) => l.serviceList?.some((id) => serviceIds.has(id)))
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [primary = "service", ...modifiers] = keywords;
  return { label: `${humanize([...modifiers, primary].join(" "))} (${tier})`, tier, locations };
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
