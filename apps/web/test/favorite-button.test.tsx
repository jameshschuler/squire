import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FavoriteButton } from "@/components/recipes/FavoriteButton";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { FAVORITES_STORAGE_KEY } from "@/lib/favorites";

const renderButton = () =>
  render(
    <FavoritesProvider>
      <FavoriteButton recipeId="bake_bread" />
    </FavoritesProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("FavoriteButton", () => {
  it("adds and removes the recipe, saving to the device", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(screen.getByRole("button", { name: "Remove from favorites" }).getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe('["bake_bread"]');

    fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }));
    expect(screen.getByRole("button", { name: "Add to favorites" }).getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe("[]");
  });

  it("starts as a favorite when it was saved before", () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '["bake_bread"]');
    renderButton();
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeDefined();
  });

  it("picks up a change made in another tab", () => {
    renderButton();
    act(() => {
      localStorage.setItem(FAVORITES_STORAGE_KEY, '["bake_bread"]');
      dispatchEvent(new StorageEvent("storage", { key: FAVORITES_STORAGE_KEY }));
    });
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeDefined();
  });
});
