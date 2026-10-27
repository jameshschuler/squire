import type { Attribute, GearType, ItemDetail, StatType } from "@walkscape-community/data-api-client";
import { QUALITIES, type ItemQuality, type ItemSummary } from "../recipe-book/types.js";
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
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function stackedStats(item: GearItem, quality: ItemQuality | null): GearStat[] {
  const tiers = quality ? QUALITIES.slice(0, QUALITIES.indexOf(quality) + 1) : [];
  return [...item.stats, ...tiers.flatMap((tier) => item.tierStats[tier] ?? [])];
}

export function isGear(item: ItemDetail): item is GearDetail {
  return "gearType" in item && typeof item.gearType === "string";
}

function gearItem(item: GearDetail, gameIds: Record<string, string>, summary: (id: string) => ItemSummary): GearItem {
  const gameId = gameIds[item.id];
  const tierStats: GearItem["tierStats"] = {};
  for (const { quality, attributes } of item.itemQualityAttrs ?? []) {
    tierStats[quality as ItemQuality] = gearStats(attributes ?? []);
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

function withoutName({ name: _name, ...condition }: { name: string | null; type: string }): GearCondition {
  return condition as GearCondition;
}
