import type {
  AchievementDetail,
  ItemDetail,
  ItemReward,
  LocationDetail,
  LootTableDetail,
  RewardDetail,
  ServiceDetail,
  ServiceRequirement,
  ShopDetail,
} from "@walkscape-community/data-api-client";
import { activityViews } from "./activities.js";
import { itemEffects } from "./effects.js";
import type { GameData } from "./game-data.js";
import { getServiceKeywords, isServiceRequirement, itemsIn, meetsServiceTier } from "./game-rules.js";
import { activityItems, lowestSkillLevels, skillLevels, sourceKey, xpRewards } from "./lookup.js";
import { humanize } from "./text.js";
import { byLevel, minLevel } from "./order.js";
import { itemSummaries, locationSummary, regionNames } from "./summaries.js";
import {
  RECIPE_BOOK_SCHEMA,
  type AchievementSource,
  type ActivitySource,
  type ActivityView,
  type ChestSource,
  type ItemWithEffects,
  type ItemSource,
  type LocationSummary,
  type RecipeBook,
  type RecipeItem,
  type RecipeLocation,
  type RecipeService,
  type RecipeView,
  type RewardSource,
  type ShopSource,
} from "./types.js";

interface Drop {
  itemId: string;
  source: ItemSource;
}

interface SourceIndexes {
  locationsByBuilding: Map<string, LocationSummary[]>;
  tables: Map<string, LootTableDetail>;
}

export function buildRecipeBook(data: GameData): RecipeBook {
  const items = new Map(data.items.map((item) => [item.id, item]));
  const skillNames = new Map(data.skills.map((skill) => [skill.id, skill.name]));
  const skillName = (id: string) => skillNames.get(id) ?? humanize(id);
  const regions = regionNames(data.factions);
  const effectNames = { skills: data.skills, regions, items };
  const summary = itemSummaries(items);
  const item = (id: string, amount: number): RecipeItem => ({ ...summary(id), amount });
  const locationsByService = indexLocations(data.locations, regions, (location) => location.serviceList);
  const locationsByActivity = indexLocations(data.locations, regions, (location) => location.activityList);
  const locationsByBuilding = indexLocations(data.locations, regions, (location) => location.buildingList);
  const tables = new Map(data.lootTables.map((lootTable) => [lootTable.id, lootTable]));

  const recipes = data.recipes.map((recipe): RecipeView => {
    const service = recipe.requirements.find(isServiceRequirement);

    return {
      id: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      skills: skillLevels(recipe.relatedSkills, recipe.requirements, skillName),
      service: service ? serviceView(service, data.services, locationsByService) : null,
      materials: recipe.materials.map((material) => material.options.map((option) => item(option.item, option.amount))),
      outputs: Object.entries(recipe.itemRewards).map(([id, amount]) => item(id, amount)),
      xp: xpRewards(recipe.xpRewards, skillName),
      workRequired: recipe.workRequired,
      maxWorkEfficiency: recipe.maxWorkEfficiency,
    };
  });

  const crafted = new Set(recipes.flatMap((recipe) => recipe.outputs.map((output) => output.id)));
  const withEffects = (keep: (item: ItemDetail) => boolean): ItemWithEffects[] =>
    data.items
      .filter(keep)
      .map((detail) => ({ ...summary(detail.id), effects: itemEffects(detail, effectNames) }))
      .sort((left, right) => left.name.localeCompare(right.name));
  const foods = withEffects((detail) => detail.type === "consumable").filter((found) => found.effects !== null);
  const loot = withEffects(
    (detail) => detail.type === "collectible" || (detail.type === "loot" && !crafted.has(detail.id)),
  ).filter((found) => found.isCollectible || found.effects !== null);
  const listed = new Set([...foods, ...loot].map((item) => item.id));
  const gear = withEffects((detail) => detail.type !== "consumable" && !listed.has(detail.id)).filter(
    (found) => found.effects !== null,
  );
  const activities = activityViews(data.activities, { summary, skillName, locationsByActivity, tables });
  const sourcedIds = new Set([
    ...recipes.flatMap((recipe) => recipe.materials.flat().map((material) => material.id)),
    ...listed,
    ...gear.map((gearItem) => gearItem.id),
    ...activityItems(activities).map((entry) => entry.id),
  ]);

  return {
    schema: RECIPE_BOOK_SCHEMA,
    version: data.version,
    recipes: recipes.sort(byLevel),
    activities,
    foods,
    loot,
    gear,
    sources: itemSources(data, activities, sourcedIds, { locationsByBuilding, tables }),
  };
}

function itemSources(
  data: GameData,
  activities: ActivityView[],
  itemIds: Set<string>,
  { locationsByBuilding, tables }: SourceIndexes,
): Record<string, ItemSource[]> {
  const activityDrops = activities.flatMap(dropsFromActivity);
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

function dropsFromActivity({ id, name, icon, skills, locations, drops }: ActivityView): Drop[] {
  return drops.flatMap(({ lootType, items }) => {
    const source: ActivitySource = { kind: "activity", id, name, icon, skills, lootType, locations };

    return items.map((item) => ({ itemId: item.id, source }));
  });
}

function dropsFromChest(chest: ItemDetail, foundBy: ItemSource[], tables: Map<string, LootTableDetail>): Drop[] {
  const source: ChestSource = {
    kind: "chest",
    id: chest.id,
    name: chest.name,
    icon: chest.icon,
    skills: lowestSkillLevels(foundBy.flatMap((origin) => ("skills" in origin ? origin.skills : []))),
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

function bySource(left: ItemSource, right: ItemSource): number {
  return (
    sourceRank(left) - sourceRank(right) ||
    compareLevels(sourceLevel(left), sourceLevel(right)) ||
    left.name.localeCompare(right.name)
  );
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

function compareLevels(left: number, right: number): number {
  return left === right ? 0 : left - right;
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
      (service) =>
        service.serviceType === "crafting" &&
        meetsServiceTier(service.tier, tier) &&
        keywords.every((keyword) => service.keywords.includes(keyword)),
    )
    .flatMap((service) =>
      (locationsByService.get(service.id) ?? []).map((location) => ({ ...location, tier: service.tier })),
    );

  const lowestByLocation = new Map<string, RecipeLocation>();

  for (const offer of offers) {
    const current = lowestByLocation.get(offer.id);

    if (!current || !meetsServiceTier(offer.tier, current.tier)) {
      lowestByLocation.set(offer.id, offer);
    }
  }

  const locations = [...lowestByLocation.values()].sort((left, right) => left.name.localeCompare(right.name));
  const [primary = "service", ...modifiers] = keywords;

  return { label: `${humanize([...modifiers, primary].join(" "))} (${tier})`, tier, locations };
}

function indexLocations(
  locations: LocationDetail[],
  regions: Map<string, string>,
  keysOf: (location: LocationDetail) => string[] | undefined,
): Map<string, LocationSummary[]> {
  const index = new Map<string, LocationSummary[]>();

  for (const location of [...locations].sort((left, right) => left.name.localeCompare(right.name))) {
    const summary = locationSummary(location, regions);

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
