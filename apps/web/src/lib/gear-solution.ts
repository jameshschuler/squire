import {
  optimizeGear,
  type GearData,
  type GearSuggestion,
  type GoalId,
  type OptimizeTarget,
  type PlayerProfile,
} from "@walkscape-community/gear-optimizer";

export interface GearRequest {
  gear: GearData;
  profile: PlayerProfile;
  target: OptimizeTarget;
  goals: GoalId[];
  tieBreakers: GoalId[];
}

export function solveGear({ gear, profile, target, goals, tieBreakers }: GearRequest): GearSuggestion {
  const suggestion = optimizeGear(gear, profile, target, [...goals, ...tieBreakers], { checkedGoals: 1 });

  return { ...suggestion, goals };
}
