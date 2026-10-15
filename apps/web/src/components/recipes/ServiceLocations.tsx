import { MapPin } from "lucide-react";
import type { RecipeService } from "@jameshschuler/walkscape-sdk";
import { Badge } from "@/components/ui/badge";

export function ServiceLocations({ service }: { service: RecipeService }) {
  if (service.locations.length === 0) {
    return <p className="text-muted-foreground">No known location</p>;
  }
  return (
    <ul className="divide-y">
      {service.locations.map((location) => (
        <li key={location.id} className="flex items-center gap-3 py-2.5">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{location.name}</span>
          {location.tier !== service.tier && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {location.tier}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
