import { useMemo } from "react";
import type { GearData, PlayerProfile } from "@squire/api/gear-data";
import { locationChoices } from "@/lib/gear-locations";
import type { GearTarget } from "@/lib/gear-targets";
import { ChoiceButtons } from "./ChoiceButtons";

interface LocationQuestionProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  onChoose: (location: string) => void;
}

export function LocationQuestion({ gear, profile, target, onChoose }: LocationQuestionProps) {
  const choices = useMemo(() => locationChoices(gear, profile, target), [gear, profile, target]);
  return <ChoiceButtons choices={choices} onChoose={onChoose} />;
}
