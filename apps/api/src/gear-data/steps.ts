export interface WorkTarget {
  skill: string;
  level: number;
  workRequired: number;
  maxWorkEfficiency: number | null;
}

export interface StatTotals {
  workEfficiency: number;
  stepsPercent: number;
  stepsFlat: number;
  doubleAction: number;
  goalStats: number[];
}

export interface StepsResult {
  efficiency: number;
  steps: number;
  averageSteps: number;
}

export const NO_STATS: StatTotals = {
  workEfficiency: 0,
  stepsPercent: 0,
  stepsFlat: 0,
  doubleAction: 0,
  goalStats: [],
};

export function addStats(a: StatTotals, b: StatTotals): StatTotals {
  return {
    workEfficiency: a.workEfficiency + b.workEfficiency,
    stepsPercent: a.stepsPercent + b.stepsPercent,
    stepsFlat: a.stepsFlat + b.stepsFlat,
    doubleAction: a.doubleAction + b.doubleAction,
    goalStats: Array.from(
      { length: Math.max(a.goalStats.length, b.goalStats.length) },
      (_, i) => (a.goalStats[i] ?? 0) + (b.goalStats[i] ?? 0),
    ),
  };
}

const LEVEL_BONUS = 0.0125;
const MAX_BONUS_LEVELS = 20;
const MIN_EFFICIENCY = 0.01;
const MIN_STEPS = 10;
export const STEP_STATS = ["workEfficiency", "stepsRequired", "doubleAction"] as const;

export const MAX_DOUBLE_ACTION = 1;
// Stops floating-point error from rounding an exact whole number of steps up by one.
const ROUNDING_SLACK = 1e-9;

// The game's formula: work efficiency (capped at the activity's max) divides the work, step changes
// apply on top, the result is rounded up with a floor of 10, and double action (capped at 100%)
// spreads it over more actions on average.
export function stepsPerAction(target: WorkTarget, skillLevel: number, totals: StatTotals): StepsResult {
  const cap = efficiencyCap(target);
  const efficiency = Math.max(
    1 + Math.min(levelBonus(target, skillLevel) + totals.workEfficiency, cap),
    MIN_EFFICIENCY,
  );
  const raw = (target.workRequired / efficiency) * (1 + totals.stepsPercent) + totals.stepsFlat;
  const steps = Math.ceil(Math.max(raw, MIN_STEPS) - ROUNDING_SLACK);
  return { efficiency, steps, averageSteps: steps / (1 + Math.min(totals.doubleAction, MAX_DOUBLE_ACTION)) };
}

// How much work efficiency can be added on top of the base 100%, from the activity's max.
export function efficiencyCap(target: WorkTarget): number {
  return target.maxWorkEfficiency === null ? Number.POSITIVE_INFINITY : target.maxWorkEfficiency - 1;
}

export function levelBonus(target: WorkTarget, skillLevel: number): number {
  return Math.min(Math.max(skillLevel - target.level, 0), MAX_BONUS_LEVELS) * LEVEL_BONUS;
}
