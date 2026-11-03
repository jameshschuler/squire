import { useEffect, useState } from "react";
import type {
  GearData,
  GearSuggestion,
  GoalId,
  OptimizeTarget,
  PlayerProfile,
} from "@walkscape-community/gear-optimizer";
import { solveInBackground } from "@/lib/gear-solver";

interface Solved {
  target: OptimizeTarget;
  profile: PlayerProfile;
  goals: GoalId[];
  tieBreakers: GoalId[];
  solution: GearSuggestion | null;
}

export interface GearSuggestionState {
  solution: GearSuggestion | null;
  failed: boolean;
}

export function useGearSuggestion(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget | null,
  goals: GoalId[],
  tieBreakers: GoalId[],
): GearSuggestionState {
  const [solved, setSolved] = useState<Solved | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }

    let active = true;
    const job = solveInBackground({ gear, profile, target, goals, tieBreakers });
    const settle = (solution: GearSuggestion | null) => {
      if (active) {
        setSolved({ target, profile, goals, tieBreakers, solution });
      }
    };

    job.result.then(settle, () => settle(null));

    return () => {
      active = false;
      job.cancel();
    };
  }, [gear, profile, target, goals, tieBreakers]);

  const current =
    solved?.target === target &&
    solved.profile === profile &&
    solved.goals === goals &&
    solved.tieBreakers === tieBreakers
      ? solved
      : null;

  return { solution: current?.solution ?? null, failed: current !== null && current.solution === null };
}
