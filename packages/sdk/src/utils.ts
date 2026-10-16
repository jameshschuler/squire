import {
  SERVICE_TIERS,
  type LootTableDetail,
  type RecipeDetail,
  type ServiceRequirement,
  type ServiceTier,
  type SkillLevelRequirement,
} from "./types.js";

/** Narrows a requirement to a skill level requirement (`{ skill, level }`). */
export function isSkillLevelRequirement(requirement: { type: string }): requirement is SkillLevelRequirement {
  return requirement.type === "skillLevel";
}

/** Narrows a requirement to a crafting service requirement. */
export function isServiceRequirement(requirement: { type: string }): requirement is ServiceRequirement {
  return requirement.type === "service";
}

/**
 * The service keywords a requirement asks for. The API uses two shapes: a `keywords` list (e.g.
 * `["kitchen", "cursed"]`) or a single `serviceKeyword`.
 */
export function getServiceKeywords(requirement: ServiceRequirement): string[] {
  const { serviceKeyword, keywords } = requirement.requirement;
  if (keywords?.length) {
    return keywords;
  }
  return serviceKeyword ? [serviceKeyword] : [];
}

/**
 * Whether a service of `serviceTier` can be used where `requiredTier` is needed. Higher tiers also
 * qualify. `requiredTier` is a plain string because service requirements don't restrict it; a tier
 * that isn't in `SERVICE_TIERS` is never met.
 */
export function meetsServiceTier(serviceTier: ServiceTier, requiredTier: string): boolean {
  const required = SERVICE_TIERS.indexOf(requiredTier as ServiceTier);
  return required !== -1 && SERVICE_TIERS.indexOf(serviceTier) >= required;
}

/** Every item id a loot table can drop, including its sub-tables. Money rows are skipped. */
export function getLootTableItemIds(table: LootTableDetail): string[] {
  const rows = [...(table.tableRows ?? []), ...(table.subTables ?? []).flatMap((sub) => sub.tableRows ?? [])];
  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}

/** Recipes that produce an item. */
export function findRecipesByOutput(recipes: RecipeDetail[], itemId: string): RecipeDetail[] {
  return recipes.filter((r) => itemId in r.itemRewards);
}

/** Recipes that take an item as a material, in any slot or option. */
export function findRecipesByMaterial(recipes: RecipeDetail[], itemId: string): RecipeDetail[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.options.some((o) => o.item === itemId)));
}
