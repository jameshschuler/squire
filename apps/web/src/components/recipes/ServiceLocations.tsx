import type { RecipeService } from "@squire/walkscape-sdk";
import { Badge } from "@/components/ui/badge";

export function ServiceLocations({ service }: { service: RecipeService }) {
  if (service.locations.length === 0) {
    return <p className="text-muted-foreground">No known location</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 leading-7">
      {service.locations.map((location) => (
        <li key={location.id} className="inline-flex items-center gap-1.5">
          {location.name}
          {location.tier !== service.tier && (
            <Badge variant="outline" className="text-muted-foreground px-1.5 py-0 text-[10px] font-normal">
              {location.tier}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
