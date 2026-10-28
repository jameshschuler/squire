import type { StatLine } from "@squire/api/gear-data";
import { formatPercent } from "./format";

type StatType = StatLine["stat"];

export interface StatRow {
  key: string;
  label: string;
  value: string;
}

export interface EfficiencyParts {
  used: number;
  cap: number;
  gear: number;
  level: number;
}

const STAT_LABELS: Partial<Record<StatType, string>> = {
  workEfficiency: "Work efficiency",
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

export function statRows(lines: StatLine[]): StatRow[] {
  const rank = (line: StatLine) => (STEP_STATS.includes(line.stat) ? STEP_STATS.indexOf(line.stat) : STEP_STATS.length);
  return lines
    .filter((line) => line.stat !== "workEfficiency" && STAT_LABELS[line.stat])
    .sort((a, b) => rank(a) - rank(b) || STAT_LABELS[a.stat]!.localeCompare(STAT_LABELS[b.stat]!))
    .map((line) => ({
      key: `${line.stat}:${line.isPercent}`,
      label: STAT_LABELS[line.stat]!,
      value: formatStatValue(line),
    }));
}

export function formatStatValue({ value, isPercent }: StatLine): string {
  const sign = value < 0 ? "−" : "+";
  const amount = Math.abs(value);
  return isPercent ? `${sign}${formatPercent(amount, 1)}` : `${sign}${Number(amount.toFixed(2))}`;
}

export function efficiencySummary({ used, cap, gear, level }: EfficiencyParts): string {
  const signed = formatStatValue({ stat: "workEfficiency", isPercent: true, value: used });
  const max = Number.isFinite(cap) ? `/${formatPercent(cap, 1)}` : "";
  return `${signed}${max} (gear ${formatPercent(gear, 1)}, level ${formatPercent(level, 1)})`;
}
