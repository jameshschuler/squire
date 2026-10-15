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

/** An item in full. Containers such as skill chests also list the `tables` they roll when opened. */
export interface ItemDetail extends CompactEntity {
  type: string;
  /** In-game keywords, e.g. "ore" or "hunting_product". Players can search the game with these. */
  keywords: string[];
  quality: string;
  tables?: LootTableRef[] | null;
}

/** A shop and the items it sells. */
export interface Shop {
  id: string;
  name: string;
  soldItems: string[];
  onlyPurchaseSellingListItems: boolean;
}

/** A gathering or other non-crafting activity, e.g. "Mine gold ore". */
export interface Activity extends CompactEntity {
  relatedSkillsList: string[];
  /** `null` for a few special activities, such as travelling. */
  requirements: Requirement[] | null;
  workRequired: number;
  maxWorkEfficiency: number;
  tables: LootTableRef[] | null;
  xpRewardsMap: Record<string, number>;
}

/** One possible drop. `rowItemID` is null for money. */
export interface LootTableRow {
  rowItemID: string | null;
  name: string;
  icon: string;
  isMoney: boolean;
  rowWeight: number;
  rowMinimumAmount: number;
  rowMaximumAmount: number;
}

export interface LootSubTable {
  type: string;
  weight: number;
  tableRows: LootTableRow[];
}

export interface LootTable {
  id: string;
  name: string;
  category: string;
  tableRows: LootTableRow[];
  subTables: LootSubTable[] | null;
}

/** A faction. Each location belongs to one, which works as its region on the map. */
export type Faction = CompactEntity;

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
  buildingList?: string[];
}
