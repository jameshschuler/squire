import type { GearAnswerView } from "@/lib/gear-answer";
import { formatRegion } from "@/lib/format";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearGrid } from "./GearGrid";
import { GearStats } from "./GearStats";
import { GearSummary } from "./GearSummary";

type GearAnswerProps = GearAnswerView & {
  showLocation: boolean;
  compare: { label: string; onClick: () => void } | null;
};

export function GearAnswer(props: GearAnswerProps) {
  const { suggestion, notes, showLocation, equipped, stats, toolSlots, compare } = props;
  const { picks, pet, location } = suggestion;
  const bestAt = showLocation && location ? `Best at ${location.name} (${formatRegion(location.region)})` : null;
  return (
    <ChatMessage>
      <GearSummary
        results={props.results}
        efficiencyStatus={props.efficiencyStatus}
        location={bestAt}
        compare={compare}
      />
      {notes.length > 0 && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {(picks.length > 0 || pet) && <GearGrid picks={picks} pet={pet} toolSlots={toolSlots} equipped={equipped} />}
      {(picks.length > 0 || pet) && <GearStats groups={stats} />}
      {picks.length > 0 && <CopyGearSetButton picks={picks} />}
    </ChatMessage>
  );
}
