import type { ServiceTier } from "@walkscape-community/data-api-client";
import type {
  GearNeed,
  ItemQuality,
  ItemSummary,
  LocationSummary,
  LootType,
} from "@walkscape-community/gear-optimizer";

export {
  QUALITIES,
  QUALITY_RANK,
  type GearNeed,
  type ItemQuality,
  type ItemSummary,
  type LocationSummary,
  type LootType,
} from "@walkscape-community/gear-optimizer";

// Bump whenever the RecipeBook shape changes, so cached copies on devices refresh.
export const RECIPE_BOOK_SCHEMA = 39;

export interface ValueRange {
  min: number;
  max: number;
}

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

export type ItemWithEffects = ItemSummary & { effects: ItemEffects | null };

export interface RecipeItem extends ItemSummary {
  amount: number;
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

export interface XpReward {
  id: string;
  name: string;
  amount: number;
}

export interface RecipeView {
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  service: RecipeService | null;
  materials: RecipeItem[][];
  outputs: RecipeItem[];
  xp: XpReward[];
  workRequired: number | null;
  maxWorkEfficiency: number | null;
}

export interface ActivityNeed {
  label: string;
  level: SkillLevel | null;
  item: ItemSummary | null;
}

// A drop at full drop rates: the chance per action of getting at least one, and the average steps per item at
// max work efficiency (`stepsEach`) and with none (`baseSteps`, the wiki's base rate).
export interface DropRate {
  chance: number;
  stepsEach: number | null;
  baseSteps: number | null;
}

// How each part of a drop's rate varies across the skill levels the activity can be done at.
export type DropRateRange = Record<keyof DropRate, ValueRange | null>;

// `rateRange` is null unless the drop's rate changes with skill level.
export interface ActivityDrop extends ItemSummary {
  rate: DropRate;
  rateRange: DropRateRange | null;
}

export interface ActivityDrops {
  lootType: LootType;
  items: ActivityDrop[];
}

export interface ActivityView {
  id: string;
  name: string;
  icon: string;
  skills: SkillLevel[];
  locations: LocationSummary[];
  needs: ActivityNeed[];
  gearNeeds: GearNeed[];
  uses: ActivityNeed[];
  drops: ActivityDrops[];
  xp: XpReward[];
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
  rate: DropRate;
  rateRange: DropRateRange | null;
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

export interface PetLevelView {
  level: number;
  stage: "juvenile" | "adult";
  effects: EffectLine[];
}

export interface PetPage {
  id: string;
  name: string;
  description: string;
  icon: string;
  egg: ItemSummary | null;
  levels: PetLevelView[];
}

// `updatedAt` is when the API loaded this game data from WalkScape (an ISO date).
export interface RecipeBook {
  schema: number;
  version: string;
  updatedAt: string;
  recipes: RecipeView[];
  activities: ActivityView[];
  foods: ItemWithEffects[];
  loot: ItemWithEffects[];
  gear: ItemWithEffects[];
  pets: PetPage[];
  sources: Record<string, ItemSource[]>;
}
