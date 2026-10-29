import type { StatTile } from "@/lib/gear-stats";
import { cn } from "@/lib/utils";

export function StatTiles({ title, tiles }: { title?: string; tiles: StatTile[] }) {
  return (
    <div>
      {title && <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>}
      <ul className="grid grid-cols-3 gap-1.5">
        {tiles.map((tile) => (
          <li
            key={tile.key}
            className={cn("rounded-lg border bg-background px-2 py-1.5", tile.highlight && "border-foreground")}
          >
            <p className="text-base font-semibold">
              {tile.value}
              {tile.highlight && <span className="sr-only"> (priority)</span>}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">{tile.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
