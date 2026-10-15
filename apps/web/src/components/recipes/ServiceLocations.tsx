import { MapPin } from "lucide-react";
import type { RecipeService } from "@jameshschuler/walkscape-sdk";
import { Badge } from "@/components/ui/badge";
import { groupByRegion } from "@/lib/locations";

export function ServiceLocations({ service }: { service: RecipeService }) {
  if (service.locations.length === 0) {
    return <p className="text-muted-foreground">No known location</p>;
  }
  return (
    <div className="space-y-4 pt-1">
      {groupByRegion(service.locations).map(({ region, locations }) => (
        <section key={region}>
          <h3 className="text-sm font-medium text-muted-foreground">{region}</h3>
          <ul className="divide-y">
            {locations.map((location) => (
              <li key={location.id} className="flex items-center gap-3 py-2.5">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{location.name}</span>
                {location.tier !== service.tier && (
                  <Badge variant="outline" className="font-normal text-muted-foreground capitalize">
                    {location.tier}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
