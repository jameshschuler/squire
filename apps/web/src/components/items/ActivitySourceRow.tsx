import type { ActivitySource } from "@squire/api/recipe-book";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatSkillLevel, lootTypeLabel } from "@/lib/format";
import { SourceLocations } from "./SourceLocations";

export function ActivitySourceRow({ source }: { source: ActivitySource }) {
  const label = lootTypeLabel(source.lootType);
  return (
    <>
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
        <SourceLocations locations={source.locations} />
      ) : (
        <p className="pl-11 text-sm text-muted-foreground">No known location</p>
      )}
    </>
  );
}
