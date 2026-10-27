import type { GearType, ItemDetail, Requirement, ServiceTier, StatType } from "@walkscape-community/data-api-client";

// Bump whenever the RecipeBook shape changes, so cached copies on devices refresh.
export const RECIPE_BOOK_SCHEMA = 27;

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

export type EffectLine = Pick<Effect, "condition" | "stat" | "normal" | "fine">;

export interface QualityEffects {
  quality: ItemQuality;
  effects: EffectLine[];
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
  isCollectible: boolean;
  keywords: string[];
}

export type ItemWithEffects = ItemSummary & { effects: ItemEffects | null };

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

export interface ActivityNeed {
  label: string;
  level: SkillLevel | null;
  item: ItemSummary | null;
}

export interface ActivityDrops {
  lootType: LootType;
  items: ItemSummary[];
}

export interface ActivityView {
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  locations: LocationSummary[];
  needs: ActivityNeed[];
  uses: ActivityNeed[];
  drops: ActivityDrops[];
  workRequired: number | null;
  maxWorkEfficiency: number | null;
}

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

type WithoutName<T> = T extends unknown ? Omit<T, "name"> : never;

export type GearCondition = WithoutName<Requirement>;

export interface GearStat {
  stat: StatType;
  value: number;
  isPercent: boolean;
  conditions: GearCondition[];
}

export interface GearItem extends ItemSummary {
  slot: GearType;
  requirements: GearCondition[];
  stats: GearStat[];
  tierStats: Partial<Record<ItemQuality, GearStat[]>>;
}

export interface SkillView {
  id: string;
  name: string;
  type: string;
}

export interface LocationView extends LocationSummary {
  realms: string[];
  keywords: string[];
}

export interface RecipeBook {
  schema: number;
  version: string;
  recipes: RecipeView[];
  activities: ActivityView[];
  foods: ItemWithEffects[];
  loot: ItemWithEffects[];
  gear: ItemWithEffects[];
  gearItems: GearItem[];
  skills: SkillView[];
  locations: LocationView[];
  sources: Record<string, ItemSource[]>;
}
