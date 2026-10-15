import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { buildRecipeBook, type GameData } from "@squire/walkscape-sdk";
import { FavoriteRecipes } from "@/components/favorites/FavoriteRecipes";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { FAVORITES_STORAGE_KEY } from "@/lib/favorites";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const { recipes } = buildRecipeBook(sample as unknown as GameData);

const renderFavorites = () =>
  renderWithRouter(
    <FavoritesProvider>
      <FavoriteRecipes recipes={recipes} />
    </FavoritesProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("FavoriteRecipes", () => {
  it("explains how to add favorites when there are none", async () => {
    await renderFavorites();
    expect(screen.getByText(/No favorites yet/)).toBeDefined();
  });

  it("lists favorite recipes, newest first", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["smelt_a_gold_bar", "bake_a_bagel"]));
    await renderFavorites();
    const names = screen.getAllByRole("link").map((link) => link.textContent);
    expect(names[0]).toMatch(/^Smelt a gold bar/);
    expect(names[1]).toMatch(/^Bake a bagel/);
    expect(names).toHaveLength(2);
  });
});
