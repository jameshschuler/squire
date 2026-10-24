import type { LootType } from "@squire/api/recipe-book";

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatSteps(workRequired: number, maxWorkEfficiency: number | null): string {
  const baseSteps = `${workRequired} base steps`;
  if (maxWorkEfficiency === null || maxWorkEfficiency <= 1) {
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

const MINOR_WORDS = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to"]);

export function formatTitle(text: string): string {
  return text
    .split(" ")
    .map((word, i) =>
      i > 0 && MINOR_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

const REGION_SHORT_NAMES: Record<string, string> = {
  "Grand Duchy of Trellin-Erdwise": "GDTE",
  "Empire of Wallisia": "Wallisia",
};

export function formatRegion(region: string): string {
  return REGION_SHORT_NAMES[region] ?? region;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatStepCount(steps: number): string {
  return `${formatNumber(steps)} steps`;
}

export function formatKeyword(keyword: string): string {
  return keyword.replace(/_/g, " ");
}

export function formatEffect(effect: { normal: string; stat: string }): string {
  return `${effect.normal} ${effect.stat.charAt(0).toLowerCase()}${effect.stat.slice(1)}`;
}

const DATE_TIME = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}
