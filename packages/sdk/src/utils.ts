import {
  SERVICE_TIERS,
  type LootTable,
  type Recipe,
  type Requirement,
  type ServiceRequirement,
  type ServiceTier,
  type SkillLevelRequirement,
} from "./types.js";

/** Narrows a requirement to a skill level requirement (`{ skill, level }`). */
export function isSkillLevelRequirement(requirement: Requirement): requirement is SkillLevelRequirement {
  return requirement.type === "skillLevel";
}

/** Narrows a requirement to a crafting service requirement. */
export function isServiceRequirement(requirement: Requirement): requirement is ServiceRequirement {
  return requirement.type === "service";
}

/**
 * The service keywords a requirement asks for. The API uses two shapes: a `keywords` list (e.g.
 * `["kitchen", "cursed"]`) or a single `serviceKeyword`.
 */
export function serviceKeywords(requirement: ServiceRequirement): string[] {
  const { serviceKeyword, keywords } = requirement.requirement;
  if (keywords?.length) {
    return keywords;
  }
  return serviceKeyword ? [serviceKeyword] : [];
}

/** Whether a service of `serviceTier` can be used where `requiredTier` is needed. Higher tiers also qualify. */
export function meetsServiceTier(serviceTier: ServiceTier, requiredTier: ServiceTier): boolean {
  return SERVICE_TIERS.indexOf(serviceTier) >= SERVICE_TIERS.indexOf(requiredTier);
}

/** Every item id a loot table can drop, including its sub-tables. Money rows are skipped. */
export function lootTableItemIds(table: LootTable): string[] {
  const rows = [...table.tableRows, ...(table.subTables ?? []).flatMap((sub) => sub.tableRows)];
  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}

/** Recipes that produce an item. */
export function recipesMaking(recipes: Recipe[], itemId: string): Recipe[] {
  return recipes.filter((r) => itemId in r.itemRewards);
}

/** Recipes that take an item as a material, in any slot or option. */
export function recipesUsing(recipes: Recipe[], itemId: string): Recipe[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.options.some((o) => o.item === itemId)));
}
