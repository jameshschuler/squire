import { useEffect, useState } from "react";
import type { GearData, GoalId, OptimizeTarget, PlayerProfile } from "@squire/api/gear-data";
import type { GearSolution } from "@/lib/gear-solution";
import { solveInBackground } from "@/lib/gear-solver";

interface Solved {
  target: OptimizeTarget;
  profile: PlayerProfile;
  goals: GoalId[];
  solution: GearSolution | null;
}

export interface GearSuggestionState {
  solution: GearSolution | null;
  failed: boolean;
}

export function useGearSuggestion(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget | null,
  goals: GoalId[],
): GearSuggestionState {
  const [solved, setSolved] = useState<Solved | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }
    let active = true;
    const job = solveInBackground({ gear, profile, target, goals });
    const settle = (solution: GearSolution | null) => {
      if (active) {
        setSolved({ target, profile, goals, solution });
      }
    };
    job.result.then(settle, () => settle(null));
    return () => {
      active = false;
      job.cancel();
    };
  }, [gear, profile, target, goals]);

  const current = solved?.target === target && solved.profile === profile && solved.goals === goals ? solved : null;
  return { solution: current?.solution ?? null, failed: current !== null && current.solution === null };
}
