import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { GearData, OptimizeTarget, PlayerProfile } from "@squire/api/gear-data";
import { gearAnswer } from "@/lib/gear-answer";
import type { GearSolution } from "@/lib/gear-solution";
import type { GearTarget } from "@/lib/gear-targets";
import { ChatMessage } from "./ChatMessage";
import { GearAnswer } from "./GearAnswer";

interface GearResultProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  optimize: OptimizeTarget;
  solution: GearSolution | null;
  failed: boolean;
}

export function GearResult({ gear, profile, target, optimize, solution, failed }: GearResultProps) {
  const answer = useMemo(
    () => solution && gearAnswer(gear, profile, target, optimize, solution),
    [gear, profile, target, optimize, solution],
  );
  if (failed) {
    return (
      <ChatMessage>
        <p role="alert">Couldn't work out a gear set. Try again, or pick different priorities.</p>
      </ChatMessage>
    );
  }
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
