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
  if (book.status === "ready" && gear.status === "ready") {
    return (
      <section className="pt-3">
        <GearChat book={book.book} gear={gear.gear} search={search} onSearchChange={onSearchChange} />
      </section>
    );
  }
  if (book.status === "error") {
    return <GameDataStatus state={book} />;
  }
  if (gear.status === "error") {
    return <GameDataStatus state={gear} />;
  }
  return <GameDataStatus state={{ status: "loading" }} />;
}
