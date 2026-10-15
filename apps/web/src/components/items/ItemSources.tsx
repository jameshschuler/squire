import type { ItemSource } from "@jameshschuler/walkscape-sdk";
import { ActivitySourceRow } from "./ActivitySourceRow";
import { ChestSourceRow } from "./ChestSourceRow";
import { ShopSourceRow } from "./ShopSourceRow";

export function ItemSources({ sources }: { sources: ItemSource[] }) {
  if (sources.length === 0) {
    return <p className="text-muted-foreground">No known source yet.</p>;
  }
  return (
    <ul className="divide-y">
      {sources.map((source) => (
        <li
          key={`${source.kind}-${source.id}-${source.kind === "activity" ? source.lootType : ""}`}
          className="space-y-1.5 py-3"
        >
          {source.kind === "activity" && <ActivitySourceRow source={source} />}
          {source.kind === "chest" && <ChestSourceRow source={source} />}
          {source.kind === "shop" && <ShopSourceRow source={source} />}
        </li>
      ))}
    </ul>
  );
}
