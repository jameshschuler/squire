import type { StatLine } from "@squire/api/gear-data";
import { formatPercent } from "./format";

type StatType = StatLine["stat"];

export interface StatTile {
  key: string;
  value: string;
  label: string;
  highlight: boolean;
}

export interface StatGroups {
  steps: StatTile[];
  other: StatTile[];
}

export interface EfficiencyParts {
  used: number;
  cap: number;
  gear: number;
  level: number;
}

const STAT_LABELS: Partial<Record<StatType, string>> = {
  stepsRequired: "Steps required",
  doubleAction: "Double action",
  doubleRewards: "Double rewards",
  noMaterialsConsumed: "No materials consumed",
  qualityOutcome: "Quality outcome",
  chestFind: "Chest finding",
  fineMaterialFind: "Fine material finding",
  bonusExperience: "Bonus XP",
  inventorySpace: "Inventory space",
  findGems: "Gem finding",
  findBirdNests: "Bird nest finding",
  findCollectibles: "Collectible finding",
  rollSpecialTable: "Special loot rolls",
};
const STEP_STATS: StatType[] = ["stepsRequired", "doubleAction"];

const TILE_LABELS: Partial<Record<`${StatType}:${boolean}`, string>> = {
  "stepsRequired:false": "Steps per action",
  "stepsRequired:true": "Steps required",
  "bonusExperience:false": "Bonus XP per action",
  "bonusExperience:true": "Bonus XP",
};

export function statGroups(lines: StatLine[], efficiency: EfficiencyParts, highlighted: StatType[]): StatGroups {
  const tile = (line: StatLine): StatTile => ({
    key: `${line.stat}:${line.isPercent}`,
    value: formatStatValue(line),
    label: TILE_LABELS[`${line.stat}:${line.isPercent}`] ?? STAT_LABELS[line.stat]!,
    highlight: highlighted.includes(line.stat),
  });
  const rank = (tile: StatTile) => {
    const index = highlighted.findIndex((stat) => tile.key.startsWith(`${stat}:`));
    return index === -1 ? highlighted.length : index;
  };
  const shown = lines
    .filter((line) => STAT_LABELS[line.stat])
    .sort((a, b) => Number(a.isPercent) - Number(b.isPercent));
  return {
    steps: [
      efficiencyTile(efficiency),
      ...STEP_STATS.flatMap((stat) => shown.filter((line) => line.stat === stat).map(tile)),
    ],
    other: shown
      .filter((line) => !STEP_STATS.includes(line.stat))
      .map(tile)
      .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)),
  };
}

function efficiencyTile(parts: EfficiencyParts): StatTile {
  const { used, cap, gear, level } = parts;
  const limit = !Number.isFinite(cap)
    ? "Work efficiency"
    : efficiencyOver(parts) >= 0
      ? "Work efficiency, maxed"
      : `Work efficiency of ${formatPercent(cap, 1)} max`;
  const label = `${limit} · gear ${formatStatValue({ isPercent: true, value: gear })}, level ${formatStatValue({ isPercent: true, value: level })}`;
  return {
    key: "workEfficiency",
    value: formatStatValue({ isPercent: true, value: used }),
    label,
    highlight: false,
  };
}

export function formatStatValue({ value, isPercent }: Pick<StatLine, "value" | "isPercent">): string {
  const sign = value < 0 ? "−" : "+";
  const amount = Math.abs(value);
  if (isPercent) {
    return `${sign}${formatPercent(amount, 1)}`;
  }
  return `${sign}${Number(amount.toFixed(2))}`;
}

export function statLabel(stat: StatType): string {
  return STAT_LABELS[stat] ?? stat;
}

export function efficiencyStatus(parts: EfficiencyParts): string {
  const { used, cap } = parts;
  if (!Number.isFinite(cap)) {
    return `Work efficiency ${formatPercent(used, 1)}, no max`;
  }
  const over = efficiencyOver(parts);
  if (over > 0) {
    return `Work efficiency maxed, ${formatPercent(over, 1)} over`;
  }
  return over === 0
    ? "Work efficiency maxed"
    : `Work efficiency ${formatPercent(used, 1)} of ${formatPercent(cap, 1)} max, ${formatPercent(-over, 1)} short`;
}

function efficiencyOver({ cap, gear, level }: EfficiencyParts): number {
  const over = gear + level - cap;
  return Math.abs(over) < 1e-9 ? 0 : over;
}
