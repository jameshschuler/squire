import type {
  AchievementDetail,
  ActivityDetail,
  ItemDetail,
  ItemReward,
  LocationDetail,
  LootTable,
  LootTableDetail,
  RewardDetail,
  ServiceDetail,
  ServiceRequirement,
  ShopDetail,
} from "@jameshschuler/walkscape-data-client";
import { itemEffects } from "./effects.js";
import type { GameData } from "./game-data.js";
import {
  getLootTableItemIds,
  getServiceKeywords,
  isServiceRequirement,
  isSkillLevelRequirement,
  meetsServiceTier,
} from "./game-rules.js";
import { lowestSkillLevels, sourceKey } from "./lookup.js";
import { humanize } from "./text.js";
import { byLevel, minLevel } from "./order.js";
import {
  RECIPE_BOOK_SCHEMA,
  type AchievementSource,
  type ActivitySource,
  type ChestSource,
  type ItemWithEffects,
  type ItemSource,
  type ItemSummary,
  type LocationSummary,
  type LootType,
  type RecipeBook,
  type RecipeItem,
  type RecipeLocation,
  type RecipeService,
  type RecipeView,
  type RewardSource,
  type ShopSource,
  type SkillLevel,
} from "./types.js";

interface Drop {
  itemId: string;
  source: ItemSource;
}

interface LocationIndexes {
  locationsByActivity: Map<string, LocationSummary[]>;
  locationsByBuilding: Map<string, LocationSummary[]>;
}

export function buildRecipeBook(data: GameData): RecipeBook {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const skillNames = new Map(data.skills.map((s) => [s.id, s.name]));
  const skillName = (id: string) => skillNames.get(id) ?? humanize(id);
  const regions = new Map(data.factions.map((f) => [f.id, f.name]));
  const effectNames = { skills: data.skills, regions, items };
  const summary = (id: string): ItemSummary => {
    const found = items.get(id);
    const keywords = [...new Set(found?.keywords ?? [])];
    const effects = found ? itemEffects(found, effectNames) : null;
    return {
      id,
      name: found?.name ?? humanize(id),
      icon: found?.icon ?? "",
      quality: found?.quality ?? null,
      isCollectible: found?.type === "collectible",
      keywords,
      effects,
    };
  };
  const item = (id: string, amount: number): RecipeItem => ({ ...summary(id), amount });
  const locationsByService = indexLocations(data.locations, regions, (l) => l.serviceList);
  const locationsByActivity = indexLocations(data.locations, regions, (l) => l.activityList);
  const locationsByBuilding = indexLocations(data.locations, regions, (l) => l.buildingList);

  const recipes = data.recipes.map((recipe): RecipeView => {
    const service = recipe.requirements.find(isServiceRequirement);
    return {
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      skills: skillLevels(recipe.relatedSkills, recipe.requirements, skillName),
      service: service ? serviceView(service, data.services, locationsByService) : null,
      materials: recipe.materials.map((m) => m.options.map((o) => item(o.item, o.amount))),
      outputs: Object.entries(recipe.itemRewards).map(([id, amount]) => item(id, amount)),
      xp: Object.entries(recipe.xpRewards ?? {}).map(([skill, amount]) => ({ skill: skillName(skill), amount })),
      workRequired: recipe.workRequired,
      maxWorkEfficiency: recipe.maxWorkEfficiency,
    };
  });

  const crafted = new Set(recipes.flatMap((r) => r.outputs.map((o) => o.id)));
  const summaries = (keep: (item: ItemDetail) => boolean) =>
    data.items
      .filter(keep)
      .map((i) => summary(i.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  const foods = summaries((i) => i.type === "consumable").filter(
    (found): found is ItemWithEffects => found.effects !== null,
  );
  const loot = summaries((i) => (i.type === "collectible" || i.type === "loot") && !crafted.has(i.id)).filter(
    (found) => found.isCollectible || found.effects !== null,
  );
  const sourcedIds = new Set([
    ...recipes.flatMap((r) => r.materials.flat().map((m) => m.id)),
    ...foods.map((f) => f.id),
    ...loot.map((l) => l.id),
  ]);
  return {
    schema: RECIPE_BOOK_SCHEMA,
    version: data.version,
    recipes: recipes.sort(byLevel),
    foods,
    loot,
    sources: itemSources(data, sourcedIds, { locationsByActivity, locationsByBuilding }, skillName),
  };
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
  const rewardDrops = [...data.achievements.flatMap(dropsFromAchievement), ...data.rewards.flatMap(dropsFromReward)];

  const drops = [...activityDrops, ...chestDrops, ...shopDrops, ...rewardDrops].filter((drop) =>
    itemIds.has(drop.itemId),
  );
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
  activity: ActivityDetail,
  locationsByActivity: Map<string, LocationSummary[]>,
  skillName: (id: string) => string,
  tables: Map<string, LootTableDetail>,
): Drop[] {
  const skills = skillLevels(activity.relatedSkillsList, activity.requirements ?? [], skillName);
  const locations = locationsByActivity.get(activity.id) ?? [];
  return (activity.tables ?? []).flatMap((ref) => {
    const source: ActivitySource = {
      kind: "activity",
      id: activity.id,
      name: activity.name,
      icon: activity.icon ?? "",
      skills,
      lootType: lootTypeOf(ref),
      locations,
    };
    return itemsIn(ref, tables).map((itemId) => ({ itemId, source }));
  });
}

function dropsFromChest(chest: ItemDetail, foundBy: ItemSource[], tables: Map<string, LootTableDetail>): Drop[] {
  const source: ChestSource = {
    kind: "chest",
    id: chest.id,
    name: chest.name,
    icon: chest.icon,
    skills: lowestSkillLevels(foundBy.flatMap((s) => ("skills" in s ? s.skills : []))),
  };
  return (chest.tables ?? []).flatMap((ref) => itemsIn(ref, tables).map((itemId) => ({ itemId, source })));
}

function dropsFromShop(shop: ShopDetail, locationsByBuilding: Map<string, LocationSummary[]>): Drop[] {
  const source: ShopSource = {
    kind: "shop",
    id: shop.id,
    name: shop.name,
    icon: "",
    locations: locationsByBuilding.get(shop.id) ?? [],
  };
  return shop.soldItems.map((itemId) => ({ itemId, source }));
}

function dropsFromAchievement(achievement: AchievementDetail): Drop[] {
  const source: AchievementSource = { kind: "achievement", id: achievement.id, name: achievement.name, icon: "" };
  return rewardedItems(achievement.itemRewards).map((itemId) => ({ itemId, source }));
}

const REWARD_NAMES: Record<RewardDetail["type"], string> = {
  achievementPoints: "Achievement points reward",
  factionReputation: "Faction reputation reward",
};

function dropsFromReward(reward: RewardDetail): Drop[] {
  const source: RewardSource = { kind: "reward", id: reward.type, name: REWARD_NAMES[reward.type], icon: "" };
  return rewardedItems(reward.rewardItems).map((itemId) => ({ itemId, source }));
}

function rewardedItems(rewards: ItemReward[]): string[] {
  return rewards.filter((reward) => reward.type === "item").map((reward) => reward.id);
}

function itemsIn(ref: LootTable, tables: Map<string, LootTableDetail>): string[] {
  return ref.tables.flatMap((id) => {
    const table = tables.get(id);
    return table ? getLootTableItemIds(table) : [];
  });
}

function lootTypeOf(ref: LootTable): LootType {
  return (ref.isPrimary ? "main" : (ref.type[0] ?? "secondary")) as LootType;
}

function bySource(a: ItemSource, b: ItemSource): number {
  return sourceRank(a) - sourceRank(b) || compareLevels(sourceLevel(a), sourceLevel(b)) || a.name.localeCompare(b.name);
}

const SOURCE_RANKS: Record<Exclude<ItemSource["kind"], "activity">, number> = {
  shop: 2,
  chest: 3,
  achievement: 4,
  reward: 5,
};

function sourceRank(source: ItemSource): number {
  if (source.kind === "activity") {
    return source.lootType === "main" ? 0 : 1;
  }
  return SOURCE_RANKS[source.kind];
}

function sourceLevel(source: ItemSource): number {
  return "skills" in source ? minLevel(source.skills) : 0;
}

function compareLevels(a: number, b: number): number {
  return a === b ? 0 : a - b;
}

function skillLevels(
  skillIds: string[],
  requirements: { type: string }[],
  skillName: (id: string) => string,
): SkillLevel[] {
  const levels = new Map(
    requirements.filter(isSkillLevelRequirement).map((r) => [r.requirement.skill, r.requirement.level]),
  );
  return skillIds.map((id) => ({ id, name: skillName(id), level: levels.get(id) ?? null }));
}

function serviceView(
  req: ServiceRequirement,
  services: ServiceDetail[],
  locationsByService: Map<string, LocationSummary[]>,
): RecipeService {
  const { tier } = req.requirement;
  const keywords = getServiceKeywords(req);
  const offers = services
    .filter(
      (s) =>
        s.serviceType === "crafting" && meetsServiceTier(s.tier, tier) && keywords.every((k) => s.keywords.includes(k)),
    )
    .flatMap((s) => (locationsByService.get(s.id) ?? []).map((location) => ({ ...location, tier: s.tier })));

  const lowestByLocation = new Map<string, RecipeLocation>();
  for (const offer of offers) {
    const current = lowestByLocation.get(offer.id);
    if (!current || !meetsServiceTier(offer.tier, current.tier)) {
      lowestByLocation.set(offer.id, offer);
    }
  }
  const locations = [...lowestByLocation.values()].sort((a, b) => a.name.localeCompare(b.name));
  const [primary = "service", ...modifiers] = keywords;
  return { label: `${humanize([...modifiers, primary].join(" "))} (${tier})`, tier, locations };
}

function indexLocations(
  locations: LocationDetail[],
  regions: Map<string, string>,
  keysOf: (location: LocationDetail) => string[] | undefined,
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
