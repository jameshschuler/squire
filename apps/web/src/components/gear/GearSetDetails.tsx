import type { ReactNode } from "react";
import type { GearSetView } from "@/lib/gear-answer";
import { GearGrid } from "./GearGrid";
import { GearStats } from "./GearStats";
import { LocationBonuses } from "./LocationBonuses";

interface GearSetDetailsProps extends GearSetView {
  statsLabel: string;
  children?: ReactNode;
}

export function GearSetDetails({
  suggestion,
  location,
  notes,
  stats,
  toolSlots,
  statsLabel,
  children,
}: GearSetDetailsProps) {
  const { picks, pet } = suggestion;

  return (
    <>
      {notes.length > 0 && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {(picks.length > 0 || pet) && <GearGrid picks={picks} pet={pet} toolSlots={toolSlots} />}
      {children}
      <GearStats groups={stats} label={statsLabel} />
      {location && <LocationBonuses {...location} />}
    </>
  );
}
