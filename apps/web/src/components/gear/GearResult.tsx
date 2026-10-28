import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { GearData, GoalId, OptimizeTarget, PlayerProfile } from "@squire/api/gear-data";
import { useGearSuggestion } from "@/hooks/useGearSuggestion";
import { gearAnswer } from "@/lib/gear-answer";
import type { GearTarget } from "@/lib/gear-targets";
import { ChatMessage } from "./ChatMessage";
import { GearAnswer } from "./GearAnswer";

interface GearResultProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  optimize: OptimizeTarget;
  goals: GoalId[];
  showLocation: boolean;
  compare: { label: string; onClick: () => void } | null;
}

export function GearResult({ gear, profile, target, optimize, goals, showLocation, compare }: GearResultProps) {
  const suggestion = useGearSuggestion(gear, profile, optimize, goals);
  const answer = useMemo(
    () => suggestion && gearAnswer(gear, profile, target, optimize, suggestion),
    [gear, profile, target, optimize, suggestion],
  );
  if (!answer) {
    return (
      <ChatMessage>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Working it out…
        </p>
      </ChatMessage>
    );
  }
  return <GearAnswer {...answer} showLocation={showLocation} compare={compare} />;
}
