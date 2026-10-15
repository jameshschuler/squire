import type { ServiceTier } from "@jameshschuler/walkscape-sdk";

// Bump whenever the RecipeBook shape changes, so cached copies on devices refresh.
export const RECIPE_BOOK_SCHEMA = 2;

export interface ItemSummary {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

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
  tier: ServiceTier;
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
  workRequired: number;
  maxWorkEfficiency: number;
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

export type ItemSource = ActivitySource | ChestSource | ShopSource;

export interface RecipeBook {
  schema: number;
  version: string;
  recipes: RecipeView[];
  sources: Record<string, ItemSource[]>;
}
