import type {
  LootTableDetail,
  ServiceRequirement,
  ServiceTier,
  SkillLevelRequirement,
} from "@jameshschuler/walkscape-sdk";

export const SERVICE_TIERS = ["basic", "advanced", "expert"] as const satisfies readonly ServiceTier[];

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
  const requiredRank = SERVICE_TIERS.indexOf(requiredTier as ServiceTier);
  const isKnownTier = requiredRank !== -1;
  return isKnownTier && SERVICE_TIERS.indexOf(serviceTier) >= requiredRank;
}

export function getLootTableItemIds(table: LootTableDetail): string[] {
  const rows = [...(table.tableRows ?? []), ...(table.subTables ?? []).flatMap((sub) => sub.tableRows ?? [])];
  return rows.flatMap((row) => (row.rowItemID ? [row.rowItemID] : []));
}
