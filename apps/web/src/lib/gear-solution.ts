import {
  fewestSteps,
  optimizeGear,
  type GearData,
  type GearSuggestion,
  type GoalId,
  type OptimizeTarget,
  type PlayerProfile,
} from "@squire/api/gear-data";

export interface GearRequest {
  gear: GearData;
  profile: PlayerProfile;
  target: OptimizeTarget;
  goals: GoalId[];
  tieBreakers: GoalId[];
}

export interface GearSolution {
  suggestion: GearSuggestion;
  fewestSteps: number;
}

const fewestByTarget = new Map<string, number>();

export function solveGear({ gear, profile, target, goals, tieBreakers }: GearRequest): GearSolution {
  const key = `${gear.version}:${JSON.stringify(target)}`;
  const fewest = fewestByTarget.get(key) ?? fewestSteps(gear, target);
  fewestByTarget.set(key, fewest);
  const suggestion = optimizeGear(gear, profile, target, [...goals, ...tieBreakers], { checkedGoals: 1 });
  return { suggestion: { ...suggestion, goals }, fewestSteps: fewest };
}
