import type { GearSuggestion, GoalId } from "@walkscape-community/gear-optimizer";
import { recommendedGoals, type GearTarget } from "./gear-targets";

export interface GearSearchDetails {
  target: GearTarget | undefined;
  location: string | undefined;
  goals: GoalId[];
  withCharacter: boolean;
  bookVersion: string;
}

export interface GearSearchAsked {
  target: string;
  kind: GearTarget["kind"];
  location: string | null;
  goals: GoalId[];
  recommended: boolean;
  withCharacter: boolean;
  bookVersion: string;
}

export interface GearSearchLog extends GearSearchAsked {
  failed: boolean;
  searchMs: number | null;
  proven: boolean | null;
  margin: GearSuggestion["margin"];
}

export function gearSearchAsked({
  target,
  location,
  goals,
  withCharacter,
  bookVersion,
}: GearSearchDetails & { target: GearTarget }): GearSearchAsked {
  const [onlyLocation] = target.locations.length === 1 ? target.locations : [];
  const recommended = recommendedGoals(target);

  return {
    target: target.id,
    kind: target.kind,
    location: location ?? onlyLocation?.id ?? null,
    goals,
    recommended: goals.length === recommended.length && goals.every((id, index) => id === recommended[index]),
    withCharacter,
    bookVersion,
  };
}

export function gearSearchLog(asked: GearSearchAsked, solution: GearSuggestion | null): GearSearchLog {
  if (!solution) {
    return { ...asked, failed: true, searchMs: null, proven: null, margin: null };
  }

  return {
    ...asked,
    failed: false,
    searchMs: Math.round(solution.searchMs),
    proven: solution.margin === null,
    margin: solution.margin,
  };
}
