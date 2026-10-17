import type {
  ActivityDetail,
  FactionDetail,
  ItemDetail,
  LocationDetail,
  LootTableDetail,
  RecipeDetail,
  ServiceDetail,
  ShopDetail,
  SkillDetail,
} from "@jameshschuler/walkscape-data-client";

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
}
