/** Resources the Data API serves. Each supports `list`, `get` and `search`. */
export type ResourceName =
  | "abilities"
  | "achievements"
  | "activities"
  | "buildings"
  | "cooldowns"
  | "factions"
  | "global_variables"
  | "items"
  | "job_boards"
  | "keywords"
  | "locations"
  | "loot_tables"
  | "pets"
  | "recipes"
  | "rewards"
  | "routes"
  | "services"
  | "shops"
  | "skills"
  | "stats"
  | "terrain_modifiers";

/** Service tiers from lowest to highest. A higher tier can craft lower-tier recipes. */
export const SERVICE_TIERS = ["basic", "advanced"] as const;

export type ServiceTier = (typeof SERVICE_TIERS)[number];

export interface VersionInfo {
  version: string;
  details: { api: string; assets: string; locales: string };
}

export interface Requirement {
  type: string;
  name: string | null;
  opposite: boolean;
  requirement: Record<string, unknown>;
}

export interface SkillLevelRequirement extends Requirement {
  type: "skillLevel";
  requirement: { skill: string; level: number };
}

export interface ServiceRequirement extends Requirement {
  type: "service";
  requirement: { serviceKeyword?: string | null; keywords?: string[]; tier: ServiceTier };
}

export interface CompactEntity {
  id: string;
  name: string;
  icon: string;
}

export interface MaterialOption {
  item: string;
  amount: number;
}
export interface MaterialSlot {
  options: MaterialOption[];
}

export interface LootTableRef {
  isPrimary: boolean;
  type: string[];
  rollAmount: number;
  tables: string[];
}

export interface Recipe extends CompactEntity {
  relatedSkills: string[];
  requirements: Requirement[];
  keywords: string[];
  workRequired: number;
  maxWorkEfficiency: number;
  materials: MaterialSlot[];
  itemRewards: Record<string, number>;
  tables: LootTableRef[];
  xpRewards: Record<string, number>;
}

export type Item = CompactEntity;

export interface Skill extends CompactEntity {
  type: string;
}

export interface Service extends CompactEntity {
  tier: ServiceTier;
  serviceType: string;
  keywords: string[];
  relatedSkills: string[];
}

export interface Location extends CompactEntity {
  faction: string;
  keywords: string[];
  serviceList?: string[];
  activityList?: string[];
}
