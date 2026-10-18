import { createFileRoute } from "@tanstack/react-router";
import { findItem } from "@squire/api/recipe-book";
import { ItemDetail } from "@/components/items/ItemDetail";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";

export const Route = createFileRoute("/items/$itemId")({
  component: ItemPage,
});

function ItemPage() {
  const { itemId } = Route.useParams();
  const state = useGameDataContext();
  if (state.status !== "ready") {
    return <GameDataStatus state={state} />;
  }
  const item = findItem(state.book, itemId);
  if (!item) {
    return <p className="py-8 text-center text-muted-foreground">Item not found.</p>;
  }
  return <ItemDetail item={item} book={state.book} />;
}
