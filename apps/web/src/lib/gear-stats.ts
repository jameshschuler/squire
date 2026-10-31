import { sameStat, type GoalStat, type SourcedStat, type StatLine } from "@squire/api/gear-data";
import { formatPercent } from "./format";

type StatType = StatLine["stat"];

const BASE_EFFICIENCY = 1;

export interface StatTile {
  key: string;
  value: string;
  label: string;
  details: string[];
  highlight: boolean;
  over: boolean;
}

export interface StatGroups {
  steps: StatTile[];
  other: StatTile[];
}

export interface EfficiencyParts {
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
  "workEfficiency:true": "Work efficiency",
  "stepsRequired:false": "Steps required (flat)",
  "bonusExperience:false": "Bonus XP per action",
  "bonusExperience:true": "Bonus XP",
};

export function statGroups(
  lines: StatLine[],
  efficiency: EfficiencyParts,
  highlighted: GoalStat[],
  steps: StatTile,
): StatGroups {
  const highlightKeys = highlighted.map(({ stat, isPercent }) => `${stat}:${isPercent}`);
  const tile = (line: StatLine): StatTile => ({
    key: `${line.stat}:${line.isPercent}`,
    value: formatStatValue(line),
    label: statName(line)!,
    details: [],
    highlight: highlightKeys.includes(`${line.stat}:${line.isPercent}`),
    over: false,
  });
  const rank = (tile: StatTile) => {
    const index = highlightKeys.indexOf(tile.key);
    return index === -1 ? highlightKeys.length : index;
  };
  const missing = highlighted
    .filter((goal) => !lines.some((line) => sameStat(line, goal)))
    .map((goal) => ({ ...goal, value: 0 }));
  const shown = [...lines, ...missing]
    .filter((line) => STAT_LABELS[line.stat])
    .sort((a, b) => Number(a.isPercent) - Number(b.isPercent));
  return {
    steps: [
      steps,
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
  const wasted = Math.min(efficiencyOver(parts), parts.gear);
  return {
    key: "workEfficiency",
    value: percent(parts.gear),
    label: "Work efficiency",
    details:
      wasted > 0 ? [`${formatPercent(wasted, 1)} wasted · max ${formatPercent(BASE_EFFICIENCY + parts.cap, 1)}`] : [],
    highlight: false,
    over: wasted > 0,
  };
}

function percent(value: number): string {
  return formatStatValue({ isPercent: true, value });
}

export function locationTiles(bonuses: SourcedStat[]): StatTile[] {
  const groups = new Map<string, SourcedStat[]>();
  for (const bonus of bonuses.filter((b) => statName(b))) {
    const key = `${bonus.stat}:${bonus.isPercent}`;
    groups.set(key, [...(groups.get(key) ?? []), bonus]);
  }
  return [...groups].map(([key, group]) => ({
    key,
    label: statName(group[0]!)!,
    value: formatStatValue({ isPercent: group[0]!.isPercent, value: group.reduce((sum, b) => sum + b.value, 0) }),
    details: [joinNames(group.map((b) => b.source))],
    highlight: false,
    over: false,
  }));
}

function joinNames(names: string[]): string {
  const words = names.map((name) => name.split(" "));
  const shared = words[0]!.findIndex((word, i) => words.some((w) => w.length <= i + 1 || w[i] !== word));
  if (names.length < 2 || shared <= 0) {
    return names.join(", ");
  }
  return `${words[0]!.slice(0, shared).join(" ")} ${words.map((w) => w.slice(shared).join(" ")).join(", ")}`;
}

export function statName({ stat, isPercent }: Pick<StatLine, "stat" | "isPercent">): string | undefined {
  return TILE_LABELS[`${stat}:${isPercent}`] ?? STAT_LABELS[stat];
}

export function formatStatValue({ value, isPercent }: Pick<StatLine, "value" | "isPercent">): string {
  const sign = value < 0 ? "−" : "+";
  const amount = Math.abs(value);
  if (isPercent) {
    return `${sign}${formatPercent(amount, 1)}`;
  }
  return `${sign}${Number(amount.toFixed(2))}`;
}

function efficiencyOver({ cap, gear, level }: EfficiencyParts): number {
  const over = gear + level - cap;
  return Math.abs(over) < 1e-9 ? 0 : over;
}
