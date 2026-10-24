import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { CharacterProvider } from "@/contexts/character-context";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { GameDataProvider } from "@/contexts/game-data-context";
import { ThemeProvider } from "@/contexts/theme-context";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <GameDataProvider>
        <FavoritesProvider>
          <CharacterProvider>
            <div className="mx-auto flex min-h-svh max-w-xl flex-col pb-[calc(env(safe-area-inset-bottom)+3.5rem)]">
              <AppHeader />
              <main className="flex-1 px-4 pb-6">
                <Outlet />
              </main>
            </div>
            <PullToRefresh />
            <BottomTabBar />
          </CharacterProvider>
        </FavoritesProvider>
      </GameDataProvider>
    </ThemeProvider>
  );
}
