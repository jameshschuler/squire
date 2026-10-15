import { MapPin } from "lucide-react";
import type { ItemSource } from "@jameshschuler/walkscape-sdk";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatRegion, formatSkillLevel, lootTypeLabel } from "@/lib/format";

export function ItemSources({ sources }: { sources: ItemSource[] }) {
  if (sources.length === 0) {
    return <p className="text-muted-foreground">No known source yet.</p>;
  }
  return (
    <ul className="divide-y">
      {sources.map((source) => {
        const label = lootTypeLabel(source.lootType);
        return (
          <li key={`${source.activityId}-${source.lootType}`} className="space-y-1.5 py-3">
            <div className="flex items-center gap-3">
              <GameIcon path={source.icon} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{source.name}</p>
                <p className="text-sm text-muted-foreground">{source.skills.map(formatSkillLevel).join(", ")}</p>
              </div>
              {label && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {label}
                </Badge>
              )}
            </div>
            {source.locations.length > 0 ? (
              <ul className="space-y-1 pl-11 text-sm">
                {source.locations.map((location) => (
                  <li key={location.id} className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {location.name} <span className="text-muted-foreground">({formatRegion(location.region)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pl-11 text-sm text-muted-foreground">No known location</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
