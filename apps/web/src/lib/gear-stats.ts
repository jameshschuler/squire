import type { StatLine } from "@squire/api/gear-data";
import { formatPercent } from "./format";

type StatType = StatLine["stat"];

export interface StatRow {
  label: string;
  value: string;
}

export interface StatGroups {
  steps: StatRow[];
  other: StatRow[];
}

export interface EfficiencyParts {
  used: number;
  cap: number;
  gear: number;
  level: number;
}

export interface EfficiencyRow {
  value: string;
  detail: string;
}

const STAT_LABELS: Partial<Record<StatType, string>> = {
  stepsRequired: "Steps required",
  doubleAction: "Double action",
  doubleRewards: "Double rewards",
  noMaterialsConsumed: "No materials consumed",
  qualityOutcome: "Quality outcome",
  chestFind: "Chest finding",
  fineMaterialFind: "Fine material finding",
  bonusExperience: "Bonus experience",
  inventorySpace: "Inventory space",
  findGems: "Gem finding",
  findBirdNests: "Bird nest finding",
  findCollectibles: "Collectible finding",
  rollSpecialTable: "Special loot rolls",
};
const STEP_STATS: StatType[] = ["stepsRequired", "doubleAction"];

export function statGroups(lines: StatLine[]): StatGroups {
  const stats = [...new Set(lines.map((line) => line.stat))].filter((stat) => STAT_LABELS[stat]);
  const row = (stat: StatType): StatRow => ({
    label: STAT_LABELS[stat]!,
    value: lines
      .filter((line) => line.stat === stat)
      .sort((a, b) => Number(a.isPercent) - Number(b.isPercent))
      .map(formatStatValue)
      .join(", "),
  });
  return {
    steps: STEP_STATS.filter((stat) => stats.includes(stat)).map(row),
    other: stats
      .filter((stat) => !STEP_STATS.includes(stat))
      .map(row)
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function formatStatValue({ stat, value, isPercent }: StatLine): string {
  const sign = value < 0 ? "−" : "+";
  const amount = Math.abs(value);
  if (isPercent) {
    return `${sign}${formatPercent(amount, 1)}`;
  }
  return `${sign}${Number(amount.toFixed(2))}${stat === "stepsRequired" ? " steps" : ""}`;
}

export function efficiencyRow({ used, cap, gear, level }: EfficiencyParts): EfficiencyRow {
  const signed = (value: number) => formatStatValue({ stat: "workEfficiency", isPercent: true, value });
  return {
    value: Number.isFinite(cap) ? `${signed(used)} of ${formatPercent(cap, 1)} max` : signed(used),
    detail: `Gear ${signed(gear)} · level ${signed(level)}`,
  };
}

export function statLabel(stat: StatType): string {
  return STAT_LABELS[stat] ?? stat;
}

export function efficiencyStatus({ used, cap, gear, level }: EfficiencyParts): string {
  if (!Number.isFinite(cap)) {
    return `Work efficiency ${formatPercent(used, 1)}, no max`;
  }
  const over = gear + level - cap;
  if (over > -1e-9) {
    return over > 1e-9
      ? `Max work efficiency reached, ${formatPercent(over, 1)} over (wasted)`
      : "Max work efficiency reached";
  }
  return `Work efficiency ${formatPercent(used, 1)} of ${formatPercent(cap, 1)} max, ${formatPercent(-over, 1)} short`;
}
