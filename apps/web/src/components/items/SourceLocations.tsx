import { MapPin } from "lucide-react";
import type { LocationSummary } from "@squire/api/recipe-book";
import { formatRegion } from "@/lib/format";
import { sortByRegion } from "@/lib/locations";

export function SourceLocations({ locations }: { locations: LocationSummary[] }) {
  return (
    <ul className="space-y-1 pl-11 text-sm">
      {sortByRegion(locations).map((location) => (
        <li key={location.id} className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span>
            {location.name} <span className="text-muted-foreground">({formatRegion(location.region)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
