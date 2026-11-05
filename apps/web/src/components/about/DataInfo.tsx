import { GEAR_DATA_SCHEMA } from "@walkscape-community/gear-optimizer";
import { RECIPE_BOOK_SCHEMA } from "@squire/api/recipe-book";
import { useGameDataContext } from "@/contexts/game-data-context";
import { formatDateTime } from "@/lib/format";

export function DataInfo() {
  const gameData = useGameDataContext();
  const pending = gameData.status === "error" ? "Couldn't load" : "Loading…";
  const rows = [
    { label: "Game data version", value: gameData.status === "ready" ? gameData.book.version : pending },
    { label: "Updated", value: gameData.status === "ready" ? formatDateTime(gameData.book.updatedAt) : pending },
    { label: "Recipe book schema", value: String(RECIPE_BOOK_SCHEMA) },
    { label: "Gear data schema", value: String(GEAR_DATA_SCHEMA) },
  ];

  return (
    <section aria-labelledby="data-info" className="space-y-2">
      <h2 id="data-info" className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Data
      </h2>
      <dl className="divide-y rounded-lg border bg-muted/30 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
