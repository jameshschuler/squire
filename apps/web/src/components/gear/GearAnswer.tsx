import type { GearAnswerView } from "@/lib/gear-answer";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearGrid } from "./GearGrid";
import { GearStats } from "./GearStats";
import { LocationBonuses } from "./LocationBonuses";

export function GearAnswer(props: GearAnswerView) {
  const { suggestion, location, notes, stats, breakdown, toolSlots } = props;
  const { picks, pet, food } = suggestion;

  return (
    <ChatMessage wide>
      {notes.length > 0 && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {(picks.length > 0 || pet || food) && <GearGrid picks={picks} pet={pet} food={food} toolSlots={toolSlots} />}
      {picks.length > 0 && <CopyGearSetButton picks={picks} />}
      <GearStats groups={stats} breakdown={breakdown} />
      {location && <LocationBonuses {...location} />}
    </ChatMessage>
  );
}
