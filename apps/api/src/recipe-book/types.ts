import type { ItemDetail, ServiceTier } from "@jameshschuler/walkscape-data-client";

// Bump whenever the RecipeBook shape changes, so cached copies on devices refresh.
export const RECIPE_BOOK_SCHEMA = 18;

export interface EffectTarget {
  id: string;
  name: string;
}

export interface Effect {
  condition: string;
  scope: string | null;
  stat: string;
  normal: string;
  fine: string | null;
  appliesTo: EffectTarget[];
}

export interface QualityEffects {
  quality: ItemQuality;
  effects: Effect[];
}

export interface ItemEffects {
  steps: number | null;
  effects: Effect[];
  tiers: QualityEffects[];
}

export type ItemQuality = ItemDetail["quality"];

export const QUALITIES: ItemQuality[] = ["common", "uncommon", "rare", "epic", "legendary", "ethereal"];

export interface ItemSummary {
  id: string;
  name: string;
  icon: string;
  quality: ItemQuality | null;
  keywords: string[];
  effects: ItemEffects | null;
}

export type ItemWithEffects = ItemSummary & { effects: ItemEffects };

export interface RecipeItem extends ItemSummary {
  amount: number;
}

export interface LocationSummary {
  id: string;
  name: string;
  region: string;
}

export interface RecipeLocation extends LocationSummary {
  tier: ServiceTier;
}

export interface RecipeService {
  label: string;
  tier: string;
  locations: RecipeLocation[];
}

export interface SkillLevel {
  id: string;
  name: string;
  level: number | null;
}

export interface RecipeView {
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  service: RecipeService | null;
  materials: RecipeItem[][];
  outputs: RecipeItem[];
  xp: { skill: string; amount: number }[];
  workRequired: number | null;
  maxWorkEfficiency: number | null;
}

export type LootType = "main" | "secondary" | "gem" | "birdNest" | "chestTable" | "collectible" | "petEgg";

export interface ActivitySource {
  kind: "activity";
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  lootType: LootType;
  locations: LocationSummary[];
}

export interface ChestSource {
  kind: "chest";
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
}

export interface ShopSource {
  kind: "shop";
  id: string;
  name: string;
  icon: string;
  locations: LocationSummary[];
}

export interface AchievementSource {
  kind: "achievement";
  id: string;
  name: string;
  icon: string;
}

export interface RewardSource {
  kind: "reward";
  id: string;
  name: string;
  icon: string;
}

export type ItemSource = ActivitySource | ChestSource | ShopSource | AchievementSource | RewardSource;

export interface RecipeBook {
  schema: number;
  version: string;
  recipes: RecipeView[];
  foods: ItemWithEffects[];
  loot: ItemWithEffects[];
  sources: Record<string, ItemSource[]>;
}
