import type { GameData } from "./gamedata.js";
import {
  SERVICE_TIERS,
  type Activity,
  type Item,
  type Location,
  type LootTable,
  type LootTableRef,
  type Service,
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

export interface LocationSummary {
  id: string;
  name: string;
  /** The region (faction) the location is in, e.g. "Jarvonia". */
  region: string;
}

export interface RecipeLocation extends LocationSummary {
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
  skills: SkillLevel[];
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
export interface SkillLevel {
  id: string;
  name: string;
  /** Level needed, or `null` when there's no level requirement. */
  level: number | null;
}

/**
 * Which roll of an activity drops the item: its `main` loot, a `secondary` roll, or a special table
 * such as `gem` finds or `birdNest` drops.
 */
export type LootType = "main" | "secondary" | "gem" | "birdNest" | "chestTable" | "collectible" | "petEgg";

/** An activity that drops an item, and where you can do it. */
export interface ItemSource {
  activityId: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  lootType: LootType;
  /** Locations offering the activity, sorted by name. */
  locations: LocationSummary[];
}

export interface RecipeBook {
  version: string;
  recipes: RecipeView[];
  /** Activities that drop each recipe material, keyed by item id. Materials with no known source are missing. */
  sources: Record<string, ItemSource[]>;
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
  const regions = new Map(data.factions.map((f) => [f.id, f.name]));
  const locationsByService = indexLocations(data.locations, regions, (l) => l.serviceList);
  const locationsByActivity = indexLocations(data.locations, regions, (l) => l.activityList);

  const recipes = data.recipes.map((recipe): RecipeView => {
    const service = recipe.requirements.find(isService);
    return {
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      skills: skillLevels(recipe.relatedSkills, recipe.requirements, skillName),
      service: service ? serviceView(service, data.services, locationsByService) : null,
      materials: recipe.materials.map((m) => m.options.map((o) => item(o.item, o.amount))),
      outputs: Object.entries(recipe.itemRewards).map(([id, amount]) => item(id, amount)),
      xp: Object.entries(recipe.xpRewards).map(([skill, amount]) => ({ skill: skillName(skill), amount })),
      workRequired: recipe.workRequired,
      maxWorkEfficiency: recipe.maxWorkEfficiency,
    };
  });

  const materialIds = new Set(recipes.flatMap((r) => r.materials.flat().map((m) => m.id)));
  return {
    version: data.version,
    recipes: recipes.sort(byLevel),
    sources: itemSources(data, materialIds, locationsByActivity, skillName),
  };
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

/** Every icon path a recipe book shows (recipes, materials, outputs and item sources), each once. Handy for prefetching. */
export function recipeBookIcons(book: RecipeBook): string[] {
  const recipeIcons = book.recipes.flatMap((r) => [r, ...r.outputs, ...r.materials.flat()]);
  const sourceIcons = Object.values(book.sources).flat();
  return [...new Set([...recipeIcons, ...sourceIcons].map((i) => i.icon).filter(Boolean))];
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

function itemSources(
  data: GameData,
  itemIds: Set<string>,
  locationsByActivity: Map<string, LocationSummary[]>,
  skillName: (id: string) => string,
): Record<string, ItemSource[]> {
  const tables = new Map(data.lootTables.map((t) => [t.id, t]));
  const drops = data.activities.flatMap((activity) =>
    activityDrops(activity, activitySource(activity, locationsByActivity, skillName), tables),
  );

  const sources: Record<string, ItemSource[]> = {};
  const seen = new Set<string>();
  for (const { itemId, source } of drops) {
    const key = `${itemId}|${source.activityId}|${source.lootType}`;
    if (itemIds.has(itemId) && !seen.has(key)) {
      seen.add(key);
      (sources[itemId] ??= []).push(source);
    }
  }
  for (const list of Object.values(sources)) {
    list.sort(bySource);
  }
  return sources;
}

type ActivitySource = Omit<ItemSource, "lootType">;

function activitySource(
  activity: Activity,
  locationsByActivity: Map<string, LocationSummary[]>,
  skillName: (id: string) => string,
): ActivitySource {
  return {
    activityId: activity.id,
    name: activity.name,
    icon: activity.icon,
    skills: skillLevels(activity.relatedSkillsList, activity.requirements ?? [], skillName),
    locations: locationsByActivity.get(activity.id) ?? [],
  };
}

function activityDrops(
  activity: Activity,
  base: ActivitySource,
  tables: Map<string, LootTable>,
): { itemId: string; source: ItemSource }[] {
  return (activity.tables ?? []).flatMap((ref) => {
    const source = { ...base, lootType: lootTypeOf(ref) };
    return ref.tables.flatMap((id) => droppedItems(tables.get(id))).map((itemId) => ({ itemId, source }));
  });
}

function lootTypeOf(ref: LootTableRef): LootType {
  return (ref.isPrimary ? "main" : (ref.type[0] ?? "secondary")) as LootType;
}

function droppedItems(table: LootTable | undefined): string[] {
  if (!table) {
    return [];
  }
  const rows = [...table.tableRows, ...(table.subTables ?? []).flatMap((sub) => sub.tableRows)];
  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}

function bySource(a: ItemSource, b: ItemSource): number {
  const main = Number(b.lootType === "main") - Number(a.lootType === "main");
  return main || minLevel(a.skills) - minLevel(b.skills) || a.name.localeCompare(b.name);
}

function skillLevels(skillIds: string[], requirements: Requirement[], skillName: (id: string) => string): SkillLevel[] {
  const levels = new Map(requirements.filter(isSkillLevel).map((r) => [r.requirement.skill, r.requirement.level]));
  return skillIds.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null }));
}

function minLevel(skills: SkillLevel[]): number {
  return Math.min(...skills.map((s) => s.level ?? 0));
}

function byLevel(a: RecipeView, b: RecipeView): number {
  return recipeLevel(a) - recipeLevel(b) || sortName(a).localeCompare(sortName(b)) || a.name.localeCompare(b.name);
}

function recipeLevel(recipe: RecipeView): number {
  return minLevel(recipe.skills);
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

function serviceView(
  req: ServiceRequirement,
  services: Service[],
  locationsByService: Map<string, LocationSummary[]>,
): RecipeService {
  const { serviceKeyword, keywords: listed, tier } = req.requirement;
  const keywords = listed?.length ? listed : serviceKeyword ? [serviceKeyword] : [];
  const offers = services
    .filter((s) => meetsTier(s.tier, tier) && keywords.every((k) => s.keywords.includes(k)))
    .flatMap((s) => (locationsByService.get(s.id) ?? []).map((location) => ({ ...location, tier: s.tier })));

  const lowestByLocation = new Map<string, RecipeLocation>();
  for (const offer of offers) {
    const current = lowestByLocation.get(offer.id);
    if (!current || tierRank(offer.tier) < tierRank(current.tier)) {
      lowestByLocation.set(offer.id, offer);
    }
  }
  const locations = [...lowestByLocation.values()].sort((a, b) => a.name.localeCompare(b.name));
  const [primary = "service", ...modifiers] = keywords;
  return { label: `${humanize([...modifiers, primary].join(" "))} (${tier})`, tier, locations };
}

function indexLocations(
  locations: Location[],
  regions: Map<string, string>,
  keysOf: (location: Location) => string[] | undefined,
): Map<string, LocationSummary[]> {
  const index = new Map<string, LocationSummary[]>();
  for (const location of [...locations].sort((a, b) => a.name.localeCompare(b.name))) {
    const summary = {
      id: location.id,
      name: location.name,
      region: regions.get(location.faction) ?? humanize(location.faction),
    };
    for (const key of keysOf(location) ?? []) {
      const list = index.get(key);
      if (list) {
        list.push(summary);
      } else {
        index.set(key, [summary]);
      }
    }
  }
  return index;
}

function meetsTier(serviceTier: ServiceTier, requiredTier: ServiceTier): boolean {
  return tierRank(serviceTier) >= tierRank(requiredTier);
}

function tierRank(tier: ServiceTier): number {
  return SERVICE_TIERS.indexOf(tier);
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
