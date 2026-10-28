import { useEffect, useState } from "react";
import {
  optimizeGear,
  type GearData,
  type GearSuggestion,
  type OptimizeTarget,
  type PlayerProfile,
} from "@squire/api/gear-data";

interface Solved {
  target: OptimizeTarget;
  profile: PlayerProfile;
  suggestion: GearSuggestion;
}

export function useGearSuggestion(
  gear: GearData,
  profile: PlayerProfile,
  target: OptimizeTarget | null,
): GearSuggestion | null {
  const [solved, setSolved] = useState<Solved | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }
    const timer = setTimeout(() => setSolved({ target, profile, suggestion: optimizeGear(gear, profile, target) }), 0);
    return () => clearTimeout(timer);
  }, [gear, profile, target]);

  return solved && solved.target === target && solved.profile === profile ? solved.suggestion : null;
}
