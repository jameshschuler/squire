import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  ownedKey,
  skillLevelOf,
  wornSteps,
  type GearData,
  type OptimizeTarget,
  type PlayerProfile,
} from "@squire/api/gear-data";
import { useGearSuggestion } from "@/hooks/useGearSuggestion";
import { answerNotes } from "@/lib/gear-answer";
import type { GearTarget } from "@/lib/gear-targets";
import { ChatMessage } from "./ChatMessage";
import { GearAnswer } from "./GearAnswer";

interface GearResultProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  optimize: OptimizeTarget;
  showLocation: boolean;
}

export function GearResult({ gear, profile, target, optimize, showLocation }: GearResultProps) {
  const suggestion = useGearSuggestion(gear, profile, optimize);
  const character = profile.kind === "character" ? profile.character : null;
  const before = useMemo(
    () => (character && suggestion ? wornSteps(gear, character, optimize, suggestion.location) : null),
    [character, suggestion, gear, optimize],
  );
  const equipped = useMemo(() => character && new Set(Object.values(character.equipped).map(ownedKey)), [character]);

  if (!suggestion) {
    return (
      <ChatMessage>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Working it out…
        </p>
      </ChatMessage>
    );
  }
  const skillLevel = character ? skillLevelOf(profile, target.skill.id) : null;
  return (
    <GearAnswer
      suggestion={suggestion}
      notes={answerNotes(suggestion, target, before, skillLevel)}
      showLocation={showLocation}
      before={before}
      equipped={equipped}
    />
  );
}
