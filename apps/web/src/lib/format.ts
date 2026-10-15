import type { LootType } from "@jameshschuler/walkscape-sdk";

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatSteps(workRequired: number, maxWorkEfficiency: number): string {
  const baseSteps = `${workRequired} base steps`;
  if (maxWorkEfficiency <= 1) {
    return baseSteps;
  }
  return `${baseSteps} · ${Math.ceil(workRequired / maxWorkEfficiency)} min steps`;
}

export function formatSkillLevel(skill: { name: string; level: number | null }): string {
  return skill.level === null ? skill.name : `${skill.name} lvl. ${skill.level}`;
}

const LOOT_TYPE_LABELS: Record<LootType, string | null> = {
  main: null,
  secondary: "Extra roll",
  gem: "Gem find",
  birdNest: "Bird nest",
  chestTable: "Chest",
  collectible: "Collectible",
  petEgg: "Pet egg",
};

export function lootTypeLabel(lootType: LootType): string | null {
  return LOOT_TYPE_LABELS[lootType] ?? null;
}

const REGION_SHORT_NAMES: Record<string, string> = {
  "Grand Duchy of Trellin-Erdwise": "GDTE",
  "Empire of Wallisia": "Wallisia",
};

export function formatRegion(region: string): string {
  return REGION_SHORT_NAMES[region] ?? region;
}
