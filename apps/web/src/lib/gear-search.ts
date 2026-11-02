import { GOALS, type GoalId } from "@walkscape-community/gear-optimizer";

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
  const allowedIds = new Set(allowed);
  const known = new Set<string>(GOALS.map((goal) => goal.id).filter((id) => allowedIds.has(id)));
  const picked = [...new Set((goals ?? "").split(","))].filter((id): id is GoalId => known.has(id));

  return picked.slice(0, MAX_GOALS);
}
