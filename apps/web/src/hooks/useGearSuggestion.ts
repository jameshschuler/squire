import { useEffect, useRef, useState } from "react";
import {
  fewestSteps,
  optimizeGear,
  type GearData,
  type GoalId,
  type OptimizeTarget,
  type PlayerProfile,
} from "@squire/api/gear-data";
import type { GearSolution } from "@/lib/gear-answer";

interface Solved extends GearSolution {
  target: OptimizeTarget;
  profile: PlayerProfile;
  goals: GoalId[];
}

interface Fewest {
  gear: GearData;
  target: OptimizeTarget;
  steps: number;
}

export function useGearSuggestion(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget | null,
  goals: GoalId[],
): GearSolution | null {
  const [solved, setSolved] = useState<Solved | null>(null);
  const fewest = useRef<Fewest | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }
    const timer = setTimeout(() => {
      if (fewest.current?.gear !== gear || fewest.current.target !== target) {
        fewest.current = { gear, target, steps: fewestSteps(gear, target) };
      }
      const suggestion = optimizeGear(gear, profile, target, goals);
      setSolved({ target, profile, goals, suggestion, fewestSteps: fewest.current.steps });
    }, 0);
    return () => clearTimeout(timer);
  }, [gear, profile, target, goals]);

  return solved && solved.target === target && solved.profile === profile && solved.goals === goals ? solved : null;
}
