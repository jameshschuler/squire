import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { LocationSummary } from "@squire/api/recipe-book";
import { formatRegion } from "@/lib/format";

export function LocationRow({ location, children }: { location: LocationSummary; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <MapPin className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">
        {location.name} <span className="text-muted-foreground">({formatRegion(location.region)})</span>
      </span>
      {children}
    </li>
  );
}
