import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { GearData, OptimizeTarget, PlayerProfile } from "@squire/api/gear-data";
import { gearAnswer, type GearSolution } from "@/lib/gear-answer";
import type { GearTarget } from "@/lib/gear-targets";
import { ChatMessage } from "./ChatMessage";
import { GearAnswer } from "./GearAnswer";

interface GearResultProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  optimize: OptimizeTarget;
  solution: GearSolution | null;
}

export function GearResult({ gear, profile, target, optimize, solution }: GearResultProps) {
  const answer = useMemo(
    () => solution && gearAnswer(gear, profile, target, optimize, solution),
    [gear, profile, target, optimize, solution],
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
  return <GearAnswer {...answer} />;
}
