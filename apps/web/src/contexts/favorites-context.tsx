import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { FAVORITES_STORAGE_KEYS, parseFavorites, toggleFavorite, type FavoriteKind } from "@/lib/favorites";

type Favorites = Record<FavoriteKind, string[]>;

interface FavoritesContextValue {
  favoriteIds: (kind: FavoriteKind) => string[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => void;
  clearFavorites: (kind: FavoriteKind) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const readFavorites = (kind: FavoriteKind) => parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEYS[kind]));
const KINDS: FavoriteKind[] = ["recipe", "activity"];
const KIND_BY_KEY = new Map(KINDS.map((kind) => [FAVORITES_STORAGE_KEYS[kind], kind]));
const readAll = () => Object.fromEntries(KINDS.map((kind) => [kind, readFavorites(kind)])) as Favorites;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState(readAll);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const kind = event.key ? KIND_BY_KEY.get(event.key) : undefined;

      if (kind) {
        setFavorites((current) => ({ ...current, [kind]: readFavorites(kind) }));
      }
    };

    addEventListener("storage", onStorage);

    return () => removeEventListener("storage", onStorage);
  }, []);

  const saveFavorites = (kind: FavoriteKind, next: string[]) => {
    localStorage.setItem(FAVORITES_STORAGE_KEYS[kind], JSON.stringify(next));
    setFavorites((current) => ({ ...current, [kind]: next }));
  };

  const value: FavoritesContextValue = {
    favoriteIds: (kind) => favorites[kind],
    isFavorite: (kind, id) => favorites[kind].includes(id),
    toggleFavorite: (kind, id) => saveFavorites(kind, toggleFavorite(readFavorites(kind), id)),
    clearFavorites: (kind) => saveFavorites(kind, []),
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
