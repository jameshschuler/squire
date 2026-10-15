import type { GameData } from "./gamedata.js";
import {
  SERVICE_TIERS,
  type Activity,
  type ItemDetail,
  type Location,
  type LootTable,
  type LootTableRef,
  type Service,
  type Shop,
  type Requirement,
  type ServiceRequirement,
  type ServiceTier,
  type SkillLevelRequirement,
} from "./types.js";

/** An item's name, icon and in-game keywords. */
export interface ItemSummary {
  id: string;
  name: string;
  icon: string;
  /** In-game keywords, e.g. "ore" or "hunting_product". Players can search the game with these. */
  keywords: string[];
}

/** An item and how many of it a recipe takes or makes. */
export interface RecipeItem extends ItemSummary {
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

/** An activity that drops the item, and where you can do it. */
export interface ActivitySource {
  kind: "activity";
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  lootType: LootType;
  /** Locations offering the activity, sorted by name. */
  locations: LocationSummary[];
}

/** A chest, such as a skill chest, that can contain the item when opened. */
export interface ChestSource {
  kind: "chest";
  id: string;
  name: string;
  icon: string;
  /** Lowest level per skill among the activities that drop the chest. */
  skills: SkillLevel[];
}

/** A shop that sells the item. */
export interface ShopSource {
  kind: "shop";
  id: string;
  name: string;
  icon: string;
  /** Locations with the shop, when the game data links one. Often empty. */
  locations: LocationSummary[];
}

/** One way to get an item. */
export type ItemSource = ActivitySource | ChestSource | ShopSource;

/** Bumped whenever the shape of `RecipeBook` changes, so caches keyed on it refresh. */
export const RECIPE_BOOK_SCHEMA = 2;

/** Every recipe, sorted by level, tagged with the game data version it came from. */
export interface RecipeBook {
  /** `RECIPE_BOOK_SCHEMA` at build time. */
  schema: number;
  version: string;
  recipes: RecipeView[];
  /**
   * Every way to get each recipe material, keyed by item id: activities first (main loot first, then
   * by level), then shops, then chests. Materials with no known source are missing.
   */
  sources: Record<string, ItemSource[]>;
}

export interface RecipeSearchOptions {
  /** Only recipes that train this skill id, e.g. `"cooking"`. */
  skill?: string;
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
    const keywords = [...new Set(found?.keywords ?? [])];
    return { id, name: found?.name ?? humanize(id), icon: found?.icon ?? "", keywords, amount };
  };
  const regions = new Map(data.factions.map((f) => [f.id, f.name]));
  const locationsByService = indexLocations(data.locations, regions, (l) => l.serviceList);
  const locationsByActivity = indexLocations(data.locations, regions, (l) => l.activityList);
  const locationsByBuilding = indexLocations(data.locations, regions, (l) => l.buildingList);

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
    schema: RECIPE_BOOK_SCHEMA,
    version: data.version,
    recipes: recipes.sort(byLevel),
    sources: itemSources(data, materialIds, { locationsByActivity, locationsByBuilding }, skillName),
  };
}

/**
 * Recipes where every word of `query` starts a word in the recipe name, an output or a material.
 * Name matches rank first, then outputs, then materials; ties keep level order. An empty query
 * returns every recipe in level order. Words are cached per recipe object, so treat recipes as
 * read-only.
 */
export function searchRecipes(recipes: RecipeView[], query: string, options: RecipeSearchOptions = {}): RecipeView[] {
  const pool = options.skill ? recipes.filter((r) => r.skills.some((s) => s.id === options.skill)) : recipes;
  const terms = words(query);
  if (terms.length === 0) {
    return pool;
  }

  const scored = pool
    .map((recipe) => ({ recipe, score: searchScore(recipe, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byLevel(a.recipe, b.recipe));
  return scored.map((s) => s.recipe);
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

/** An item's name, icon and keywords, found from any recipe that makes or uses it. */
export function findItem(recipes: RecipeView[], itemId: string): ItemSummary | undefined {
  for (const recipe of recipes) {
    const found = [...recipe.outputs, ...recipe.materials.flat()].find((i) => i.id === itemId);
    if (found) {
      return { id: found.id, name: found.name, icon: found.icon, keywords: found.keywords };
    }
  }
  return undefined;
}

/**
 * Identifies one source of an item. An activity can drop the same item from several loot types, so
 * those each get their own key.
 */
export function sourceKey(source: ItemSource): string {
  return source.kind === "activity" ? `activity:${source.id}:${source.lootType}` : `${source.kind}:${source.id}`;
}

/** The lowest level needed per skill across a set of skill levels, lowest first. */
export function lowestSkillLevels(skills: SkillLevel[]): SkillLevel[] {
  const lowest = new Map<string, SkillLevel>();
  for (const skill of skills) {
    const current = lowest.get(skill.id);
    if (!current || (skill.level ?? 0) < (current.level ?? 0)) {
      lowest.set(skill.id, skill);
    }
  }
  return [...lowest.values()].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

/** Recipes that take an item as a material, in any slot or option. */
export function recipesUsing(recipes: RecipeView[], itemId: string): RecipeView[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.some((m) => m.id === itemId)));
}

interface Drop {
  itemId: string;
  source: ItemSource;
}

interface LocationIndexes {
  locationsByActivity: Map<string, LocationSummary[]>;
  locationsByBuilding: Map<string, LocationSummary[]>;
}

function itemSources(
  data: GameData,
  itemIds: Set<string>,
  { locationsByActivity, locationsByBuilding }: LocationIndexes,
  skillName: (id: string) => string,
): Record<string, ItemSource[]> {
  const tables = new Map(data.lootTables.map((t) => [t.id, t]));
  const activityDrops = data.activities.flatMap((activity) =>
    dropsFromActivity(activity, locationsByActivity, skillName, tables),
  );
  const activitySourcesByItem = groupDrops(activityDrops);
  const chestDrops = data.items
    .filter((item) => item.tables?.length)
    .flatMap((chest) => dropsFromChest(chest, activitySourcesByItem.get(chest.id) ?? [], tables));
  const shopDrops = data.shops.flatMap((shop) => dropsFromShop(shop, locationsByBuilding));

  const drops = [...activityDrops, ...chestDrops, ...shopDrops].filter((drop) => itemIds.has(drop.itemId));
  return Object.fromEntries(groupDrops(drops));
}

function groupDrops(drops: Drop[]): Map<string, ItemSource[]> {
  const byItem = new Map<string, ItemSource[]>();
  const seen = new Set<string>();
  for (const { itemId, source } of drops) {
    const key = `${itemId}|${sourceKey(source)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const list = byItem.get(itemId);
    if (list) {
      list.push(source);
    } else {
      byItem.set(itemId, [source]);
    }
  }
  for (const list of byItem.values()) {
    list.sort(bySource);
  }
  return byItem;
}

function dropsFromActivity(
  activity: Activity,
  locationsByActivity: Map<string, LocationSummary[]>,
  skillName: (id: string) => string,
  tables: Map<string, LootTable>,
): Drop[] {
  const skills = skillLevels(activity.relatedSkillsList, activity.requirements ?? [], skillName);
  const locations = locationsByActivity.get(activity.id) ?? [];
  return (activity.tables ?? []).flatMap((ref) => {
    const source: ActivitySource = {
      kind: "activity",
      id: activity.id,
      name: activity.name,
      icon: activity.icon,
      skills,
      lootType: lootTypeOf(ref),
      locations,
    };
    return itemsIn(ref, tables).map((itemId) => ({ itemId, source }));
  });
}

function dropsFromChest(chest: ItemDetail, foundBy: ItemSource[], tables: Map<string, LootTable>): Drop[] {
  const source: ChestSource = {
    kind: "chest",
    id: chest.id,
    name: chest.name,
    icon: chest.icon,
    skills: lowestSkillLevels(foundBy.flatMap((s) => (s.kind === "shop" ? [] : s.skills))),
  };
  return (chest.tables ?? []).flatMap((ref) => itemsIn(ref, tables).map((itemId) => ({ itemId, source })));
}

function dropsFromShop(shop: Shop, locationsByBuilding: Map<string, LocationSummary[]>): Drop[] {
  const source: ShopSource = {
    kind: "shop",
    id: shop.id,
    name: shop.name,
    icon: "",
    locations: locationsByBuilding.get(shop.id) ?? [],
  };
  return shop.soldItems.map((itemId) => ({ itemId, source }));
}

function itemsIn(ref: LootTableRef, tables: Map<string, LootTable>): string[] {
  return ref.tables.flatMap((id) => droppedItems(tables.get(id)));
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
  return sourceRank(a) - sourceRank(b) || compareLevels(sourceLevel(a), sourceLevel(b)) || a.name.localeCompare(b.name);
}

function sourceRank(source: ItemSource): number {
  if (source.kind === "activity") {
    return source.lootType === "main" ? 0 : 1;
  }
  return source.kind === "shop" ? 2 : 3;
}

function sourceLevel(source: ItemSource): number {
  return source.kind === "shop" ? 0 : minLevel(source.skills);
}

function compareLevels(a: number, b: number): number {
  return a === b ? 0 : a - b;
}

function skillLevels(skillIds: string[], requirements: Requirement[], skillName: (id: string) => string): SkillLevel[] {
  const levels = new Map(requirements.filter(isSkillLevel).map((r) => [r.requirement.skill, r.requirement.level]));
  return skillIds.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null }));
}

function minLevel(skills: SkillLevel[]): number {
  return skills.length > 0 ? Math.min(...skills.map((s) => s.level ?? 0)) : Number.POSITIVE_INFINITY;
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

interface SearchWords {
  name: string[];
  outputs: string[];
  materials: string[];
}

const searchWordsCache = new WeakMap<RecipeView, SearchWords>();

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
