import type { Attribute, GearType, ItemDetail, StatType } from "@walkscape-community/data-api-client";
import {
  QUALITIES,
  type GearCondition,
  type GearItem,
  type GearStat,
  type ItemQuality,
  type ItemSummary,
} from "./types.js";

type GearDetail = Extract<ItemDetail, { gearType: GearType }>;

export function gearItems(items: ItemDetail[], summary: (id: string) => ItemSummary): GearItem[] {
  return items
    .filter(isGear)
    .map((item) => gearItem(item, summary))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function gearStatsAt(item: GearItem, quality: ItemQuality | null): GearStat[] {
  const tiers = quality ? QUALITIES.slice(0, QUALITIES.indexOf(quality) + 1) : [];
  return [...item.stats, ...tiers.flatMap((tier) => item.tierStats[tier] ?? [])];
}

function isGear(item: ItemDetail): item is GearDetail {
  return "gearType" in item && typeof item.gearType === "string";
}

function gearItem(item: GearDetail, summary: (id: string) => ItemSummary): GearItem {
  const tierStats: GearItem["tierStats"] = {};
  for (const { quality, attributes } of item.itemQualityAttrs ?? []) {
    tierStats[quality as ItemQuality] = gearStats(attributes ?? []);
  }
  return {
    ...summary(item.id),
    slot: item.gearType,
    requirements: (item.requirements ?? []).map(withoutName),
    stats: gearStats(item.itemAttrs ?? []),
    tierStats,
  };
}

function gearStats(attributes: Attribute[]): GearStat[] {
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
