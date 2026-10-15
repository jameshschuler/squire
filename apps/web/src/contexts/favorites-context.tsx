import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { FAVORITES_STORAGE_KEY, parseFavorites, toggleFavorite } from "@/lib/favorites";

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipeId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const readFavorites = () => parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY));

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState(readFavorites);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY) {
        setFavoriteIds(readFavorites());
      }
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  const value: FavoritesContextValue = {
    favoriteIds,
    isFavorite: (recipeId) => favoriteIds.includes(recipeId),
    toggleFavorite: (recipeId) => {
      const next = toggleFavorite(favoriteIds, recipeId);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      setFavoriteIds(next);
    },
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) {
    throw new Error("useFavoritesContext must be used inside FavoritesProvider");
  }
  return value;
}
