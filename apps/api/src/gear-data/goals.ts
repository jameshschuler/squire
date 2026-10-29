import type { StatType } from "@walkscape-community/data-api-client";
import type { LootType } from "../recipe-book/types.js";
import type { StatTotals, StepsResult } from "./steps.js";

export type GoalId =
  "steps" | "items" | "xp" | "chests" | "fine" | "gems" | "birdNests" | "collectibles" | "materials" | "quality";

export type GoalKind = "any" | "activity" | "recipe";

export interface GoalStat {
  stat: StatType;
  isPercent: boolean;
}

export interface Goal {
  id: GoalId;
  label: string;
  description: string;
  stat: GoalStat | null;
  perStep: boolean;
  kind: GoalKind;
  lootType: LootType | null;
}

export type Score = number[];

const percent = (stat: StatType): GoalStat => ({ stat, isPercent: true });

export const GOALS: Goal[] = [
  {
    id: "steps",
    label: "Fastest",
    description: "Fewest steps per action, counting work efficiency and double action",
    stat: null,
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "items",
    label: "Most items",
    description: "Double rewards: extra items from each action",
    stat: percent("doubleRewards"),
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "xp",
    label: "Most XP",
    description: "Bonus XP from each action",
    stat: percent("bonusExperience"),
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "materials",
    label: "Save materials",
    description: "Chance a craft doesn't use up its materials",
    stat: percent("noMaterialsConsumed"),
    perStep: false,
    kind: "recipe",
    lootType: null,
  },
  {
    id: "quality",
    label: "Best quality",
    description: "Quality outcome: better crafted items",
    stat: { stat: "qualityOutcome", isPercent: false },
    perStep: false,
    kind: "recipe",
    lootType: null,
  },
  {
    id: "chests",
    label: "Most chests",
    description: "Chest finding",
    stat: percent("chestFind"),
    perStep: true,
    kind: "activity",
    lootType: "chestTable",
  },
  {
    id: "fine",
    label: "Most fine materials",
    description: "Fine material finding",
    stat: percent("fineMaterialFind"),
    perStep: true,
    kind: "activity",
    lootType: null,
  },
  {
    id: "gems",
    label: "Most gems",
    description: "Gem finding",
    stat: percent("findGems"),
    perStep: true,
    kind: "activity",
    lootType: "gem",
  },
  {
    id: "birdNests",
    label: "Most bird nests",
    description: "Bird nest finding",
    stat: percent("findBirdNests"),
    perStep: true,
    kind: "activity",
    lootType: "birdNest",
  },
  {
    id: "collectibles",
    label: "Most collectibles",
    description: "Collectible finding",
    stat: percent("findCollectibles"),
    perStep: true,
    kind: "activity",
    lootType: "collectible",
  },
];

const SIGNIFICANT_DIGITS = 9;

export function sameStat(a: GoalStat, b: GoalStat): boolean {
  return a.stat === b.stat && a.isPercent === b.isPercent;
}

export function goalOf(id: GoalId): Goal {
  return GOALS.find((goal) => goal.id === id)!;
}

export function goalStats(goals: GoalId[]): GoalStat[] {
  const stats = goals.flatMap((id) => goalOf(id).stat ?? []);
  return stats.filter((stat, i) => stats.findIndex((other) => sameStat(other, stat)) === i);
}

export function goalScorer(goals: GoalId[]): (result: StepsResult, totals: StatTotals) => Score {
  const stats = goalStats(goals);
  const parts = goals.map((id) => {
    const { stat, perStep } = goalOf(id);
    const index = stat ? stats.findIndex((s) => sameStat(s, stat)) : null;
    return { index, perStep };
  });
  return (result, totals) =>
    parts.map(({ index, perStep }) => {
      if (index === null) {
        return -result.averageSteps;
      }
      const value = totals.goalStats[index] ?? 0;
      return perStep ? (1 + value) / result.averageSteps : value;
    });
}

export function compareScores(a: Score, b: Score): number {
  for (let i = 0; i < a.length; i++) {
    const [x, y] = [rounded(a[i]!), rounded(b[i]!)];
    if (x !== y) {
      return x - y;
    }
  }
  return 0;
}

function rounded(value: number): number {
  return Number(value.toPrecision(SIGNIFICANT_DIGITS));
}
