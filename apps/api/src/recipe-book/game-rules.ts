import type {
  LootTable,
  LootTableDetail,
  ServiceRequirement,
  ServiceTier,
  SkillLevelRequirement,
} from "@walkscape-community/data-api-client";
import type { LootType } from "./types.js";

export const SERVICE_TIERS = ["basic", "advanced", "expert"] as const satisfies readonly ServiceTier[];
const SERVICE_TIER_RANK = new Map<string, number>(SERVICE_TIERS.map((tier, index) => [tier, index]));

export function isSkillLevelRequirement(requirement: { type: string }): requirement is SkillLevelRequirement {
  return requirement.type === "skillLevel";
}

export function isServiceRequirement(requirement: { type: string }): requirement is ServiceRequirement {
  return requirement.type === "service";
}

export function getServiceKeywords(requirement: ServiceRequirement): string[] {
  const { serviceKeyword, keywords } = requirement.requirement;

  if (keywords?.length) {
    return keywords;
  }

  return serviceKeyword ? [serviceKeyword] : [];
}

export function meetsServiceTier(serviceTier: ServiceTier, requiredTier: string): boolean {
  return (SERVICE_TIER_RANK.get(serviceTier) ?? -1) >= (SERVICE_TIER_RANK.get(requiredTier) ?? -1);
}

export function getLootTableItemIds(table: LootTableDetail): string[] {
  const rows = [...(table.tableRows ?? []), ...(table.subTables ?? []).flatMap((sub) => sub.tableRows ?? [])];

  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}

export function itemsIn(ref: LootTable, tables: Map<string, LootTableDetail>): string[] {
  return ref.tables.flatMap((id) => {
    const table = tables.get(id);

    return table ? getLootTableItemIds(table) : [];
  });
}

export function lootTypeOf(ref: LootTable): LootType {
  return (ref.isPrimary ? "main" : (ref.type[0] ?? "secondary")) as LootType;
}

export function itemsPerRoll(table: LootTableDetail, itemId: string): number {
  const rows = table.tableRows ?? [];
  const totalWeight = rows.reduce((sum, row) => sum + row.rowWeight, 0);
  const itemWeight = rows
    .filter((row) => row.rowItemID === itemId)
    .reduce((sum, row) => sum + (row.rowWeight * (row.rowMinimumAmount + row.rowMaximumAmount)) / 2, 0);

  return totalWeight > 0 ? ((1 - table.noDropChance) * itemWeight) / totalWeight : 0;
}

export function itemsPerAction(refs: LootTable[], tables: Map<string, LootTableDetail>, itemId: string): number {
  return refs.reduce(
    (sum, ref) =>
      ref.tables.reduce((refSum, id) => {
        const table = tables.get(id);

        return refSum + (table ? ref.rollAmount * itemsPerRoll(table, itemId) : 0);
      }, sum),
    0,
  );
}

export function wearOf(
  workRequired: number | null,
  maxWorkEfficiency: number | null,
  perAction: number,
): number | null {
  if (!workRequired || !maxWorkEfficiency || perAction <= 0) {
    return null;
  }

  return Math.round(Math.ceil(workRequired / maxWorkEfficiency) / perAction);
}
