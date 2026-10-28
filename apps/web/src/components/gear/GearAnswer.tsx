import { ownedKey, type GearSuggestion, type StepsResult } from "@squire/api/gear-data";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatStepsResult } from "@/lib/gear-answer";
import { formatRegion } from "@/lib/format";
import { ChatMessage } from "./ChatMessage";
import { CopyGearSetButton } from "./CopyGearSetButton";
import { GearPickRow } from "./GearPickRow";

interface GearAnswerProps {
  suggestion: GearSuggestion;
  notes: string[];
  showLocation: boolean;
  before: StepsResult | null;
  equipped: Set<string> | null;
}

export function GearAnswer({ suggestion, notes, showLocation, before, equipped }: GearAnswerProps) {
  const { picks, pet, location, result } = suggestion;
  return (
    <ChatMessage>
      <div>
        <p className="font-semibold">{formatStepsResult(result)}</p>
        {before && <p className="text-sm text-muted-foreground">Now: {formatStepsResult(before)}</p>}
        {showLocation && location && (
          <p className="text-sm text-muted-foreground">
            Best at {location.name} ({formatRegion(location.region)})
          </p>
        )}
      </div>
      {notes.map((note) => (
        <p key={note} className="text-sm">
          {note}
        </p>
      ))}
      {(picks.length > 0 || pet) && (
        <ul className="divide-y">
          {picks.map((pick) => (
            <GearPickRow
              key={`${pick.slot}:${pick.item.id}:${pick.quality ?? ""}`}
              pick={pick}
              equipped={equipped?.has(ownedKey({ id: pick.item.id, quality: pick.quality })) ?? false}
            />
          ))}
          {pet && (
            <li className="flex items-center gap-3 py-2">
              <GameIcon path={pet.pet.icon} />
              <span>
                <span className="block font-medium">{pet.pet.name}</span>
                <span className="block text-sm text-muted-foreground">Pet · level {pet.level}</span>
              </span>
            </li>
          )}
        </ul>
      )}
      {picks.length > 0 && <CopyGearSetButton picks={picks} />}
    </ChatMessage>
  );
}
