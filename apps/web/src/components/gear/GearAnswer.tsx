import type { GearAnswerView } from "@/lib/gear-answer";
import { BestInGameSet } from "./BestInGameSet";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearSetDetails } from "./GearSetDetails";

export function GearAnswer({ bestInGame, ...answer }: GearAnswerView) {
  const { picks } = answer.suggestion;

  return (
    <ChatMessage wide>
      <GearSetDetails {...answer} statsLabel="Set stats">
        {picks.length > 0 && <CopyGearSetButton picks={picks} />}
      </GearSetDetails>
      {bestInGame && <BestInGameSet {...bestInGame} />}
    </ChatMessage>
  );
}
