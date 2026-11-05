import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { FAVORITES_STORAGE_KEYS } from "@/lib/favorites";

const renderButton = () =>
  render(
    <FavoritesProvider>
      <FavoriteButton kind="recipe" id="bake_bread" />
    </FavoritesProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("FavoriteButton", () => {
  it("adds and removes the recipe, saving to the device", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(screen.getByRole("button", { name: "Remove from favorites" }).getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.recipe)).toBe('["bake_bread"]');

    fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }));
    expect(screen.getByRole("button", { name: "Add to favorites" }).getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.recipe)).toBe("[]");
  });

  it("starts as a favorite when it was saved before", () => {
    localStorage.setItem(FAVORITES_STORAGE_KEYS.recipe, '["bake_bread"]');
    renderButton();
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeDefined();
  });

  it("keeps activity favorites apart from recipe favorites", () => {
    render(
      <FavoritesProvider>
        <FavoriteButton kind="activity" id="bake_bread" />
      </FavoritesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.activity)).toBe('["bake_bread"]');
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.recipe)).toBeNull();
  });

  it("keeps a favorite saved since the page last read them", () => {
    renderButton();
    localStorage.setItem(FAVORITES_STORAGE_KEYS.recipe, '["smelt_a_gold_bar"]');
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.recipe)).toBe('["bake_bread","smelt_a_gold_bar"]');
  });

  it("picks up a change made in another tab", () => {
    renderButton();
    act(() => {
      localStorage.setItem(FAVORITES_STORAGE_KEYS.recipe, '["bake_bread"]');
      dispatchEvent(new StorageEvent("storage", { key: FAVORITES_STORAGE_KEYS.recipe }));
    });
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeDefined();
  });
});
