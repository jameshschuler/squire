import { Store } from "lucide-react";
import type { ShopSource } from "@squire/api/recipe-book";
import { formatTitle } from "@/lib/format";
import { SourceLocations } from "./SourceLocations";
import { SourceIconTile } from "./SourceIconTile";

export function ShopSourceRow({ source }: { source: ShopSource }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <SourceIconTile icon={Store} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{formatTitle(source.name)}</p>
          <p className="text-sm text-muted-foreground">Shop</p>
        </div>
      </div>
      {source.locations.length > 0 && <SourceLocations locations={source.locations} />}
    </>
  );
}
