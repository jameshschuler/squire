import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA, buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import { RecipeSearch } from "@/components/recipes/RecipeSearch";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { GameDataProvider } from "@/contexts/game-data-context";
import { FAVORITES_STORAGE_KEY } from "@/lib/favorites";
import { FAVORITES_FILTER } from "@/lib/recipe-filters";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const book = { ...buildRecipeBook(sample as unknown as GameData), schema: RECIPE_BOOK_SCHEMA };

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function renderSearch(skill: string | undefined, onSkillChange = () => {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(book))),
  );
  await renderWithRouter(
    <GameDataProvider>
      <FavoritesProvider>
        <RecipeSearch query="" skill={skill} onQueryChange={() => {}} onSkillChange={onSkillChange} />
      </FavoritesProvider>
    </GameDataProvider>,
  );
  await screen.findAllByRole("link");
}

describe("RecipeSearch favorites", () => {
  it("lists only favorites under the Favorites chip, with Clear all", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["smelt_a_gold_bar"]));
    await renderSearch(FAVORITES_FILTER);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual([
      expect.stringContaining("Smelt a gold bar"),
    ]);
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDefined();
  });

  it("has no Favorites chip or Clear all when nothing is starred", async () => {
    await renderSearch(FAVORITES_FILTER);
    expect(screen.queryByRole("button", { name: "Favorites" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("drops the chip and the filter after clearing favorites", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["smelt_a_gold_bar"]));
    const onSkillChange = vi.fn();
    await renderSearch(FAVORITES_FILTER, onSkillChange);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
    expect(screen.queryByRole("button", { name: "Favorites" })).toBeNull();
    expect(onSkillChange).toHaveBeenCalledWith(undefined);
  });
});
