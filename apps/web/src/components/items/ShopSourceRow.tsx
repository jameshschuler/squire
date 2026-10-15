import { Store } from "lucide-react";
import type { ShopSource } from "@jameshschuler/walkscape-sdk";
import { formatTitle } from "@/lib/format";
import { SourceLocations } from "./SourceLocations";

export function ShopSourceRow({ source }: { source: ShopSource }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Store className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{formatTitle(source.name)}</p>
          <p className="text-sm text-muted-foreground">Shop</p>
        </div>
      </div>
      {source.locations.length > 0 && <SourceLocations locations={source.locations} />}
    </>
  );
}
