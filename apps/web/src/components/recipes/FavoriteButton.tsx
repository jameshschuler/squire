import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoritesContext } from "@/contexts/favorites-context";
import { cn } from "@/lib/utils";

export function FavoriteButton({ recipeId }: { recipeId: string }) {
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const favorite = isFavorite(recipeId);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      onClick={() => toggleFavorite(recipeId)}
    >
      <Star className={cn("size-6", favorite && "fill-current text-amber-400")} />
    </Button>
  );
}
