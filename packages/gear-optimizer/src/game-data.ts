import type {
  AchievementDetail,
  ActivityDetail,
  FactionDetail,
  ItemDetail,
  KeywordDetail,
  LocationDetail,
  LootTableDetail,
  PetDetail,
  RecipeDetail,
  RewardDetail,
  ServiceDetail,
  ShopDetail,
  SkillDetail,
} from "@walkscape-community/data-api-client";

// `fetchedAt` is when the API loaded this data from WalkScape (an ISO date).
export interface GameData {
  version: string;
  fetchedAt: string;
  recipes: RecipeDetail[];
  items: ItemDetail[];
  skills: SkillDetail[];
  services: ServiceDetail[];
  locations: LocationDetail[];
  factions: FactionDetail[];
  activities: ActivityDetail[];
  lootTables: LootTableDetail[];
  shops: ShopDetail[];
  achievements: AchievementDetail[];
  rewards: RewardDetail[];
  pets: PetDetail[];
  keywords: KeywordDetail[];
  gameIds: Record<string, string>;
}

export type ItemQuality = ItemDetail["quality"];

export const QUALITIES: ItemQuality[] = ["common", "uncommon", "rare", "epic", "legendary", "ethereal"];
export const QUALITY_RANK = new Map(QUALITIES.map((quality, index) => [quality, index]));

export interface ItemSummary {
  id: string;
  name: string;
  icon: string;
  quality: ItemQuality | null;
  isCollectible: boolean;
  keywords: string[];
}

export interface LocationSummary {
  id: string;
  name: string;
  region: string;
}

export type LootType = "main" | "secondary" | "gem" | "birdNest" | "chestTable" | "collectible" | "petEgg";

// Gear an activity can't be done without: `count` different equipped items that each have one of
// `keywords` (and, with `level`, take at least that skill level to wear), or the item `itemId`.
export interface GearNeed {
  label: string;
  keywords: string[];
  count: number;
  level: { skill: string; level: number } | null;
  itemId: string | null;
}
