import { Loader2 } from "lucide-react";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";
import { useGearDataContext } from "@/contexts/gear-data-context";
import type { GearSearch } from "@/lib/gear-search";
import { GearChat } from "./GearChat";

interface GearPageProps {
  search: GearSearch;
  onSearchChange: (search: GearSearch) => void;
}

export function GearPage({ search, onSearchChange }: GearPageProps) {
  const book = useGameDataContext();
  const gear = useGearDataContext();
  return (
    <section className="space-y-3 pt-3">
      {book.status !== "ready" && <GameDataStatus state={book} />}
      {gear.status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading gear data…
        </p>
      )}
      {gear.status === "error" && <p className="text-sm text-destructive">{gear.message}</p>}
      {book.status === "ready" && gear.status === "ready" && (
        <GearChat book={book.book} gear={gear.gear} search={search} onSearchChange={onSearchChange} />
      )}
    </section>
  );
}
