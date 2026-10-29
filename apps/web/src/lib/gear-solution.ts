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
}

export interface GearSolution {
  suggestion: GearSuggestion;
  fewestSteps: number;
}

const fewestByTarget = new Map<string, number>();

export function solveGear({ gear, profile, target, goals }: GearRequest): GearSolution {
  const key = `${gear.version}:${JSON.stringify(target)}`;
  const fewest = fewestByTarget.get(key) ?? fewestSteps(gear, target);
  fewestByTarget.set(key, fewest);
  return { suggestion: optimizeGear(gear, profile, target, goals), fewestSteps: fewest };
}
