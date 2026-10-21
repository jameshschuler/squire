import type {
  AchievementDetail,
  ActivityDetail,
  FactionDetail,
  ItemDetail,
  LocationDetail,
  LootTableDetail,
  RecipeDetail,
  RewardDetail,
  ServiceDetail,
  ShopDetail,
  SkillDetail,
} from "@walkscape-community/data-api-client";

export interface GameData {
  version: string;
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
}
