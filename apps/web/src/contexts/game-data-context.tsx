import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { RecipeBook } from "@squire/walkscape-sdk";
import { fetchRecipeBook } from "@/lib/api";
import { prefetchRecipeBookIcons } from "@/lib/icon-prefetch";

export type GameDataState =
  { status: "loading" } | { status: "ready"; book: RecipeBook } | { status: "error"; message: string };

const GameDataContext = createContext<GameDataState | undefined>(undefined);

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameDataState>({ status: "loading" });

  useEffect(() => {
    fetchRecipeBook()
      .then((book) => {
        setState({ status: "ready", book });
        void prefetchRecipeBookIcons(book);
      })
      .catch((error: Error) => setState({ status: "error", message: error.message }));
  }, []);

  return <GameDataContext.Provider value={state}>{children}</GameDataContext.Provider>;
}

export function useGameDataContext(): GameDataState {
  const state = useContext(GameDataContext);
  if (!state) {
    throw new Error("useGameDataContext must be used inside GameDataProvider");
  }
  return state;
}
