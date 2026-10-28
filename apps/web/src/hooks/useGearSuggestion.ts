import { useEffect, useState } from "react";
import {
  optimizeGear,
  type GearData,
  type GoalId,
  type GearSuggestion,
  type OptimizeTarget,
  type PlayerProfile,
} from "@squire/api/gear-data";

interface Solved {
  target: OptimizeTarget;
  profile: PlayerProfile;
  goals: GoalId[];
  suggestion: GearSuggestion;
}

export function useGearSuggestion(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget | null,
  goals: GoalId[],
): GearSuggestion | null {
  const [solved, setSolved] = useState<Solved | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }
    const timer = setTimeout(
      () => setSolved({ target, profile, goals, suggestion: optimizeGear(gear, profile, target, goals) }),
      0,
    );
    return () => clearTimeout(timer);
  }, [gear, profile, target, goals]);

  return solved && solved.target === target && solved.profile === profile && solved.goals === goals
    ? solved.suggestion
    : null;
}
