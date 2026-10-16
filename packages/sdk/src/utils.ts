import {
  SERVICE_TIERS,
  type LootTableDetail,
  type RecipeDetail,
  type ServiceRequirement,
  type ServiceTier,
  type SkillLevelRequirement,
} from "./types.js";

/**
 * Narrows a requirement to a skill level requirement (`{ skill, level }`).
 *
 * @example
 * const recipe = await client.recipes.get("smelt_a_gold_bar");
 * recipe.requirements.filter(isSkillLevelRequirement).map((r) => r.requirement);
 * // [{ skill: "smithing", level: 15 }]
 */
export function isSkillLevelRequirement(requirement: { type: string }): requirement is SkillLevelRequirement {
  return requirement.type === "skillLevel";
}

/**
 * Narrows a requirement to a crafting service requirement.
 *
 * @example
 * const service = recipe.requirements.find(isServiceRequirement);
 * service?.requirement; // { serviceKeyword: "forge", tier: "basic" }
 */
export function isServiceRequirement(requirement: { type: string }): requirement is ServiceRequirement {
  return requirement.type === "service";
}

/**
 * The service keywords a requirement asks for. The API uses two shapes: a `keywords` list (e.g.
 * `["workshop", "cursed"]`) or a single `serviceKeyword`. This returns a list either way.
 *
 * @example
 * const service = recipe.requirements.find(isServiceRequirement);
 * if (service) {
 *   getServiceKeywords(service); // ["forge"], from { serviceKeyword: "forge", tier: "basic" }
 * }
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
 *
 * @example
 * meetsServiceTier("advanced", "basic"); // true: an advanced forge can smelt basic recipes
 * meetsServiceTier("basic", "advanced"); // false
 */
export function meetsServiceTier(serviceTier: ServiceTier, requiredTier: string): boolean {
  const required = SERVICE_TIERS.indexOf(requiredTier as ServiceTier);
  return required !== -1 && SERVICE_TIERS.indexOf(serviceTier) >= required;
}

/**
 * Every item id a loot table can drop, including its sub-tables. Money rows are skipped.
 *
 * @example
 * const table = await client.lootTables.get("mine_gold_ore");
 * getLootTableItemIds(table); // ["gold_ore"]
 */
export function getLootTableItemIds(table: LootTableDetail): string[] {
  const rows = [...(table.tableRows ?? []), ...(table.subTables ?? []).flatMap((sub) => sub.tableRows ?? [])];
  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}

/**
 * Recipes that produce an item.
 *
 * @example
 * const recipes = await client.recipes.loadAll();
 * findRecipesByOutput(recipes, "gold_bar").map((r) => r.name); // ["Smelt a gold bar"]
 */
export function findRecipesByOutput(recipes: RecipeDetail[], itemId: string): RecipeDetail[] {
  return recipes.filter((r) => itemId in r.itemRewards);
}

/**
 * Recipes that take an item as a material, in any slot or option.
 *
 * @example
 * findRecipesByMaterial(recipes, "gold_bar").map((r) => r.name);
 * // ["Craft a golden sewing needle", "Craft golden cutting mat", ...]
 */
export function findRecipesByMaterial(recipes: RecipeDetail[], itemId: string): RecipeDetail[] {
  return recipes.filter((r) => r.materials.some((slot) => slot.options.some((o) => o.item === itemId)));
}
