import { GOALS, type GoalId } from "@squire/api/gear-data";

export interface GearSearch {
  target?: string;
  location?: string;
  goals?: string;
}

export const MAX_GOALS = 3;

export function validateGearSearch(search: Record<string, unknown>): GearSearch {
  return {
    target: typeof search.target === "string" ? search.target : undefined,
    location: typeof search.location === "string" ? search.location : undefined,
    goals: typeof search.goals === "string" ? search.goals : undefined,
  };
}

export function parseGoals(goals: string | undefined, allowed: GoalId[]): GoalId[] {
  const known = new Set<string>(GOALS.map((g) => g.id).filter((id) => allowed.includes(id)));
  const picked = [...new Set((goals ?? "").split(","))].filter((id): id is GoalId => known.has(id));
  return picked.slice(0, MAX_GOALS);
}
