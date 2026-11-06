import type {
  ActivityDetail,
  LootTable,
  LootTableDetail,
  ServiceRequirement,
  ServiceTier,
  SkillLevelRequirement,
} from "@walkscape-community/data-api-client";
import type { LootType, ValueRange } from "./types.js";

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

type LootRow = NonNullable<LootTableDetail["tableRows"]>[number];
type LevelBonus = NonNullable<LootRow["requirementsBonuses"]>[number];

function levelScale(bonus: LevelBonus, level: number, minScale: number): number {
  const { levelRequirement, levelMinScaling: start, levelMaxScaling: end } = bonus;

  if (level < levelRequirement) {
    return 0;
  }

  if (end <= start) {
    return 1;
  }

  return Math.max(minScale, Math.min(1, (level - start + 1) / (end - start + 1)));
}

function rowWeightAt(row: LootRow, level: number | null): number {
  if (level === null) {
    return row.rowWeight;
  }

  return (row.requirementsBonuses ?? []).reduce(
    (weight, bonus) => weight * levelScale(bonus, level, row.minWeightScale ?? 0),
    row.rowWeight,
  );
}

export function itemsPerRoll(table: LootTableDetail, itemId: string, level: number | null = null): number {
  const rows = table.tableRows ?? [];
  const totalWeight = rows.reduce((sum, row) => sum + rowWeightAt(row, level), 0);
  const itemWeight = rows
    .filter((row) => row.rowItemID === itemId)
    .reduce((sum, row) => sum + (rowWeightAt(row, level) * (row.rowMinimumAmount + row.rowMaximumAmount)) / 2, 0);

  return totalWeight > 0 ? ((1 - table.noDropChance) * itemWeight) / totalWeight : 0;
}

function eachRoll(refs: LootTable[], tables: Map<string, LootTableDetail>) {
  return refs.flatMap((ref) =>
    ref.tables.flatMap((id) => {
      const table = tables.get(id);

      return table ? [{ table, rolls: ref.rollAmount }] : [];
    }),
  );
}

export function itemsPerAction(
  refs: LootTable[],
  tables: Map<string, LootTableDetail>,
  itemId: string,
  level: number | null = null,
): number {
  return eachRoll(refs, tables).reduce((sum, { table, rolls }) => sum + rolls * itemsPerRoll(table, itemId, level), 0);
}

export function stepsEach(
  workRequired: number | null,
  maxWorkEfficiency: number | null,
  perAction: number,
): number | null {
  if (!workRequired || !maxWorkEfficiency || perAction <= 0) {
    return null;
  }

  return Math.round(Math.ceil(workRequired / maxWorkEfficiency) / perAction);
}

export function scalingLevels(
  requirements: ActivityDetail["requirements"],
  refs: LootTable[],
  tables: Map<string, LootTableDetail>,
): number[] {
  const bonuses = eachRoll(refs, tables)
    .flatMap(({ table }) => table.tableRows ?? [])
    .flatMap((row) => row.requirementsBonuses ?? []);

  if (bonuses.length === 0) {
    return [];
  }

  const requiredLevels = new Map<string, number>(
    (requirements ?? [])
      .filter(isSkillLevelRequirement)
      .map(({ requirement }) => [requirement.skill, requirement.level]),
  );
  const first = Math.max(1, ...bonuses.map((bonus) => requiredLevels.get(bonus.relatedSkill) ?? 1));
  const last = Math.max(first, ...bonuses.map((bonus) => Math.max(bonus.levelRequirement, bonus.levelMaxScaling)));

  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
}

export function rangeOf(values: (number | null)[]): ValueRange | null {
  const known = values.filter((value) => value !== null);

  if (known.length === 0) {
    return null;
  }

  const min = Math.min(...known);
  const max = Math.max(...known);

  return min === max ? null : { min, max };
}
