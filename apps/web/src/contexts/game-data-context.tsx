import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RecipeBook } from "@squire/api/recipe-book";
import { fetchRecipeBook } from "@/lib/api";
import { prefetchRecipeBookIcons } from "@/lib/icon-prefetch";

export type GameDataState =
  { status: "loading" } | { status: "ready"; book: RecipeBook } | { status: "error"; message: string };

export type GameDataContextValue = GameDataState & { refresh: () => Promise<void> };

const GameDataContext = createContext<GameDataContextValue | undefined>(undefined);

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameDataState>({ status: "loading" });

  useEffect(() => {
    const keepNewer = (next: GameDataState) => setState((current) => (current.status === "ready" ? current : next));
    fetchRecipeBook()
      .then((book) => {
        keepNewer({ status: "ready", book });
        void prefetchRecipeBookIcons(book);
      })
      .catch((error: Error) => keepNewer({ status: "error", message: error.message }));
  }, []);

  const refresh = useCallback(async () => {
    const book = await fetchRecipeBook({ fresh: true });
    setState({ status: "ready", book });
    void prefetchRecipeBookIcons(book);
  }, []);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
}

export function useGameDataContext(): GameDataContextValue {
  const value = useContext(GameDataContext);
  if (!value) {
    throw new Error("useGameDataContext must be used inside GameDataProvider");
  }
  return value;
}
