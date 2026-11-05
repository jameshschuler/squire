import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFavoritesContext } from "@/contexts/favorites-context";
import type { FavoriteKind } from "@/lib/favorites";

const NAMES: Record<FavoriteKind, string> = { recipe: "recipes", activity: "activities" };

export function ClearFavoritesButton({ kind, onCleared }: { kind: FavoriteKind; onCleared: () => void }) {
  const { clearFavorites } = useFavoritesContext();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Trash2 />
          Clear all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all favorite {NAMES[kind]}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your favorite {NAMES[kind]} from this device. You can't undo it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearFavorites(kind);
              onCleared();
            }}
          >
            Clear all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
