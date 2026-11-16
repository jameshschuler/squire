import type { Attribute, GearType, ItemDetail, StatType } from "@walkscape-community/data-api-client";
import { QUALITIES, QUALITY_RANK, type ItemQuality, type ItemSummary } from "./game-data.js";
import type { GearCondition, GearItem, GearStat } from "./types.js";

type GearDetail = Extract<ItemDetail, { gearType: GearType }>;

export function gearItems(
  items: ItemDetail[],
  gameIds: Record<string, string>,
  summary: (id: string) => ItemSummary,
): GearItem[] {
  return items
    .filter(isGear)
    .map((item) => gearItem(item, gameIds, summary))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function ownedKey({ id, quality }: { id: string; quality: ItemQuality | null }): string {
  return `${id}:${quality ?? ""}`;
}

export function stackedStats(item: GearItem, quality: ItemQuality | null): GearStat[] {
  const tiers = quality ? QUALITIES.slice(0, (QUALITY_RANK.get(quality) ?? -1) + 1) : [];

  return [...item.stats, ...tiers.flatMap((tier) => item.tierStats[tier] ?? [])];
}

type QualityTier = NonNullable<ItemDetail["itemQualityAttrs"]>[number];

// The item's quality tiers, leaving out any the API sends without a quality.
export function qualityTiers(item: ItemDetail): (QualityTier & { quality: ItemQuality })[] {
  return (item.itemQualityAttrs ?? []).filter((tier): tier is QualityTier & { quality: ItemQuality } =>
    Boolean(tier.quality),
  );
}

export function isGear(item: ItemDetail): item is GearDetail {
  return "gearType" in item && typeof item.gearType === "string";
}

function gearItem(item: GearDetail, gameIds: Record<string, string>, summary: (id: string) => ItemSummary): GearItem {
  const gameId = gameIds[item.id];
  const tierStats: GearItem["tierStats"] = {};

  for (const { quality, attributes } of qualityTiers(item)) {
    tierStats[quality] = gearStats(attributes ?? []);
  }

  return {
    ...summary(item.id),
    gameId: gameId && gameId !== item.id ? gameId : null,
    slot: item.gearType,
    requirements: (item.requirements ?? []).map(withoutName),
    stats: gearStats(item.itemAttrs ?? []),
    tierStats,
  };
}

export function gearStats(attributes: Attribute[]): GearStat[] {
  return attributes.flatMap((attribute) => {
    const [stat] = attribute.stats as { type: StatType; value: number; isPercent: boolean }[];

    if (!stat) {
      return [];
    }

    return [
      {
        stat: stat.type,
        value: stat.value,
        isPercent: stat.isPercent,
        conditions: (attribute.requirements ?? []).map(withoutName),
      },
    ];
  });
}

function withoutName({ name: _name, ...condition }: { name?: string | null; type: string }): GearCondition {
  return condition as GearCondition;
}
