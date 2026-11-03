import {
  fastestInGame,
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

export interface GearSolution {
  suggestion: GearSuggestion;
  bestInGame: GearSuggestion;
}

const bestInGameByTarget = new Map<string, GearSuggestion>();

export function solveGear({ gear, profile, target, goals, tieBreakers }: GearRequest): GearSolution {
  const key = `${gear.version}:${JSON.stringify(target)}`;
  const bestInGame = bestInGameByTarget.get(key) ?? fastestInGame(gear, target);

  bestInGameByTarget.set(key, bestInGame);
  const suggestion = optimizeGear(gear, profile, target, [...goals, ...tieBreakers], { checkedGoals: 1 });

  return { suggestion: { ...suggestion, goals }, bestInGame };
}
