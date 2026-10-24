import type { RecipeService } from "@squire/api/recipe-book";
import { LocationRow } from "@/components/shared/LocationRow";
import { Badge } from "@/components/ui/badge";
import { sortByRegion } from "@/lib/locations";

export function ServiceLocations({ service }: { service: RecipeService }) {
  if (service.locations.length === 0) {
    return <p className="text-muted-foreground">No known location</p>;
  }
  return (
    <ul className="divide-y">
      {sortByRegion(service.locations).map((location) => (
        <LocationRow key={location.id} location={location}>
          {location.tier !== service.tier && (
            <Badge variant="outline" className="font-normal text-muted-foreground capitalize">
              {location.tier}
            </Badge>
          )}
        </LocationRow>
      ))}
    </ul>
  );
}
