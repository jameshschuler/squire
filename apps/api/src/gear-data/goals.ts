import type { StatType } from "@walkscape-community/data-api-client";
import type { LootType } from "../recipe-book/types.js";
import type { StatTotals, StepsResult } from "./steps.js";

export type GoalId = "steps" | "items" | "xp" | "chests" | "fine" | "gems" | "birdNests" | "collectibles";

export interface Goal {
  id: GoalId;
  label: string;
  stat: StatType | null;
  lootType: LootType | null;
}

export type Score = number[];

export const GOALS: Goal[] = [
  { id: "steps", label: "Fewest steps", stat: null, lootType: null },
  { id: "items", label: "Most items", stat: "doubleRewards", lootType: null },
  { id: "xp", label: "Most XP", stat: "bonusExperience", lootType: null },
  { id: "chests", label: "Most chests", stat: "chestFind", lootType: "chestTable" },
  { id: "fine", label: "Most fine materials", stat: "fineMaterialFind", lootType: null },
  { id: "gems", label: "Most gems", stat: "findGems", lootType: "gem" },
  { id: "birdNests", label: "Most bird nests", stat: "findBirdNests", lootType: "birdNest" },
  { id: "collectibles", label: "Most collectibles", stat: "findCollectibles", lootType: "collectible" },
];

const SIGNIFICANT_DIGITS = 9;

export function goalStats(goals: GoalId[]): StatType[] {
  return [...new Set(goals.flatMap((id) => GOALS.find((g) => g.id === id)?.stat ?? []))];
}

export function goalScorer(goals: GoalId[]): (result: StepsResult, totals: StatTotals) => Score {
  const stats = goalStats(goals);
  const indexes = goals.map((id) => {
    const stat = GOALS.find((g) => g.id === id)?.stat;
    return stat ? stats.indexOf(stat) : null;
  });
  return (result, totals) =>
    indexes.map((index) =>
      index === null ? -result.averageSteps : (1 + (totals.goalStats[index] ?? 0)) / result.averageSteps,
    );
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
