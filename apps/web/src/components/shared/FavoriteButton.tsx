import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoritesContext } from "@/contexts/favorites-context";
import type { FavoriteKind } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ kind, id }: { kind: FavoriteKind; id: string }) {
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const favorite = isFavorite(kind, id);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      onClick={() => toggleFavorite(kind, id)}
    >
      <Star className={cn("size-6", favorite && "fill-current text-amber-400")} />
    </Button>
  );
}
