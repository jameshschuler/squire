import type { GearType, Requirement, StatType } from "@walkscape-community/data-api-client";
import type { ItemQuality, ItemSummary, LocationSummary } from "../recipe-book/types.js";

// Bump whenever the GearData shape changes, so cached copies on devices refresh.
export const GEAR_DATA_SCHEMA = 1;

type WithoutName<T> = T extends unknown ? Omit<T, "name"> : never;

export type GearCondition = WithoutName<Requirement>;

export interface GearStat {
  stat: StatType;
  value: number;
  isPercent: boolean;
  conditions: GearCondition[];
}

export interface GearItem extends ItemSummary {
  gameId: string | null;
  slot: GearType;
  requirements: GearCondition[];
  stats: GearStat[];
  tierStats: Partial<Record<ItemQuality, GearStat[]>>;
}

export interface PetLevel {
  level: number;
  stats: GearStat[];
}

export interface PetView {
  id: string;
  name: string;
  rareId: string;
  icon: string;
  levels: PetLevel[];
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

export interface GearData {
  schema: number;
  version: string;
  items: GearItem[];
  pets: PetView[];
  bannedKeywords: Record<string, string[]>;
  skills: SkillView[];
  locations: LocationView[];
}
