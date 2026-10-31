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
  stats: GoalStat[];
  value: (stats: number[]) => number;
  perStep: boolean;
  kind: GoalKind;
  lootType: LootType | null;
}

// One number per priority, compared in order; higher is better. See compareScores.
export type Score = number[];

// Keeps "outputs per material" finite when refunds reach 100%.
const MIN_MATERIAL_USE = 0.01;

const percent = (stat: StatType): GoalStat => ({ stat, isPercent: true });
const single = ([value]: number[]) => value ?? 0;
// Saved materials: doubled crafts give more per craft, refunded crafts cost nothing, so outputs per
// material spent is (1 + double rewards) / (1 − no materials consumed).
const outputsPerMaterial = ([doubleRewards, noMaterialsConsumed]: number[]) =>
  (1 + (doubleRewards ?? 0)) / Math.max(1 - (noMaterialsConsumed ?? 0), MIN_MATERIAL_USE);

export const GOALS: Goal[] = [
  {
    id: "steps",
    label: "Fastest",
    description: "Fewest steps per action, counting work efficiency and double action",
    stats: [],
    value: single,
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "items",
    label: "Most items",
    description: "Double rewards: extra items from each action",
    stats: [percent("doubleRewards")],
    value: single,
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "xp",
    label: "Most XP",
    description: "Bonus XP from each action",
    stats: [percent("bonusExperience")],
    value: single,
    perStep: true,
    kind: "any",
    lootType: null,
  },
  {
    id: "materials",
    label: "Save materials",
    description:
      "More items from your materials: refunded crafts (no materials consumed) and doubled crafts (double rewards)",
    stats: [percent("doubleRewards"), percent("noMaterialsConsumed")],
    value: outputsPerMaterial,
    perStep: false,
    kind: "recipe",
    lootType: null,
  },
  {
    id: "quality",
    label: "Best quality",
    description: "Quality outcome: better crafted items",
    stats: [{ stat: "qualityOutcome", isPercent: false }],
    value: single,
    perStep: false,
    kind: "recipe",
    lootType: null,
  },
  {
    id: "chests",
    label: "Most chests",
    description: "Chest finding",
    stats: [percent("chestFind")],
    value: single,
    perStep: true,
    kind: "activity",
    lootType: "chestTable",
  },
  {
    id: "fine",
    label: "Most fine materials",
    description: "Fine material finding",
    stats: [percent("fineMaterialFind")],
    value: single,
    perStep: true,
    kind: "activity",
    lootType: null,
  },
  {
    id: "gems",
    label: "Most gems",
    description: "Gem finding",
    stats: [percent("findGems")],
    value: single,
    perStep: true,
    kind: "activity",
    lootType: "gem",
  },
  {
    id: "birdNests",
    label: "Most bird nests",
    description: "Bird nest finding",
    stats: [percent("findBirdNests")],
    value: single,
    perStep: true,
    kind: "activity",
    lootType: "birdNest",
  },
  {
    id: "collectibles",
    label: "Most collectibles",
    description: "Collectible finding",
    stats: [percent("findCollectibles")],
    value: single,
    perStep: true,
    kind: "activity",
    lootType: "collectible",
  },
];

const SIGNIFICANT_DIGITS = 9;
const MARGIN_TOLERANCE = 1e-9;

export function sameStat(a: GoalStat, b: GoalStat): boolean {
  return a.stat === b.stat && a.isPercent === b.isPercent;
}

export function goalOf(id: GoalId): Goal {
  return GOALS.find((goal) => goal.id === id)!;
}

// The stats the goals need, without repeats. Candidates store goal stats in this order.
export function goalStats(goals: GoalId[]): GoalStat[] {
  const stats = goals.flatMap((id) => goalOf(id).stats);
  return stats.filter((stat, i) => stats.findIndex((other) => sameStat(other, stat)) === i);
}

export function goalValue(goals: GoalId[], id: GoalId): (goalStats: number[]) => number {
  const stats = goalStats(goals);
  const goal = goalOf(id);
  const indexes = goal.stats.map((stat) => stats.findIndex((s) => sameStat(s, stat)));
  return (goalStats) => goal.value(indexes.map((i) => goalStats[i] ?? 0));
}

// Scores a set: "Fastest" is −average steps, per-step goals are (1 + bonus) / average steps so a
// faster set earns more per step, and the rest are their value as is.
export function goalScorer(goals: GoalId[]): (result: StepsResult, totals: StatTotals) => Score {
  const parts = goals.map((id) => ({ goal: goalOf(id), value: goalValue(goals, id) }));
  return (result, totals) =>
    parts.map(({ goal, value }) => {
      if (goal.stats.length === 0) {
        return -result.averageSteps;
      }
      const gained = value(totals.goalStats);
      return goal.perStep ? (1 + gained) / result.averageSteps : gained;
    });
}

// How far a set could be from the best possible: a fraction (0.02 is 2%) on the first priority that isn't proven.
export interface Margin {
  goal: GoalId;
  gap: number;
}

// Compares the set's score with the ceiling priority by priority. While they tie, that priority is
// proven; at the first difference, either the set is higher (proven best) or the gap is the margin.
export function marginOf(goals: GoalId[], found: Score, ceiling: Score | null): Margin | null {
  if (!ceiling) {
    return null;
  }
  for (const [i, goal] of goals.entries()) {
    const [have, best] = [rounded(found[i]!), rounded(ceiling[i]!)];
    if (best !== have) {
      return best < have ? null : { goal, gap: (best - have) / (Math.abs(best) || Math.abs(have)) };
    }
  }
  return null;
}

// Whether a claimed margin really holds against the true best (from brute force or an exact search).
// It fails if the real gap is on an earlier priority than claimed, or wider on the same one.
export function marginHolds(goals: GoalId[], claimed: Margin | null, found: Score, best: Score): boolean {
  const real = marginOf(goals, found, best);
  if (!real) {
    return true;
  }
  if (!claimed) {
    return false;
  }
  const [claimedAt, realAt] = [goals.indexOf(claimed.goal), goals.indexOf(real.goal)];
  return claimedAt < realAt || (claimedAt === realAt && real.gap <= claimed.gap + MARGIN_TOLERANCE);
}

// Positive when a beats b. Each number is rounded first so floating-point noise never decides a tie.
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
