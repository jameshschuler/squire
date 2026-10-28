import { formatStepsResult, type GearAnswerView } from "@/lib/gear-answer";
import { formatRegion } from "@/lib/format";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearGrid } from "./GearGrid";
import { GearStats } from "./GearStats";

type GearAnswerProps = GearAnswerView & { showLocation: boolean };

export function GearAnswer(props: GearAnswerProps) {
  const { suggestion, notes, showLocation, before, equipped, efficiency, stats, toolSlots } = props;
  const { picks, pet, location, result } = suggestion;
  const context = [
    before && `Now ${formatStepsResult(before)}`,
    showLocation && location && `at ${location.name} (${formatRegion(location.region)})`,
  ].filter(Boolean);
  return (
    <ChatMessage>
      <div>
        <p className="font-semibold">{formatStepsResult(result)}</p>
        {context.length > 0 && <p className="text-xs text-muted-foreground">{context.join(" · ")}</p>}
      </div>
      {notes.length > 0 && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {(picks.length > 0 || pet) && <GearGrid picks={picks} pet={pet} toolSlots={toolSlots} equipped={equipped} />}
      {(picks.length > 0 || pet) && <GearStats efficiency={efficiency} groups={stats} />}
      {picks.length > 0 && <CopyGearSetButton picks={picks} />}
    </ChatMessage>
  );
}
