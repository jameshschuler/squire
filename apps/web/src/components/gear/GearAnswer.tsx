import type { GearAnswerView } from "@/lib/gear-answer";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearGrid } from "./GearGrid";
import { GearStats } from "./GearStats";

export function GearAnswer(props: GearAnswerView) {
  const { suggestion, notes, equipped, stats, toolSlots } = props;
  const { picks, pet } = suggestion;
  return (
    <ChatMessage wide>
      {notes.length > 0 && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {(picks.length > 0 || pet) && <GearGrid picks={picks} pet={pet} toolSlots={toolSlots} equipped={equipped} />}
      <GearStats groups={stats} />
      {picks.length > 0 && <CopyGearSetButton picks={picks} />}
    </ChatMessage>
  );
}
