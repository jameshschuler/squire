import { Gauge } from "lucide-react";
import type { StatTile } from "@/lib/gear-stats";
import { StatTiles } from "./StatTiles";

interface GearSummaryProps {
  results: StatTile[];
  efficiencyStatus: string;
  location: string | null;
  compare: { label: string; onClick: () => void } | null;
}

export function GearSummary({ results, efficiencyStatus, location, compare }: GearSummaryProps) {
  return (
    <section aria-label="Summary" className="space-y-1.5">
      <StatTiles tiles={results} />
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Gauge className="size-3.5" />
          {efficiencyStatus}
        </span>
        {location && <span>{location}</span>}
        {compare && (
          <button
            type="button"
            onClick={compare.onClick}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {compare.label}
          </button>
        )}
      </p>
    </section>
  );
}
