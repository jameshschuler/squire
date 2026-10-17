import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA } from "@squire/api/recipe-book";
import { GameDataProvider, useGameDataContext } from "@/contexts/game-data-context";

function Probe() {
  const state = useGameDataContext();
  return (
    <p>
      {state.status === "ready"
        ? `${state.book.recipes.length} recipes`
        : state.status === "error"
          ? state.message
          : "loading"}
    </p>
  );
}

function mockFetch(response: Response) {
  const fetch = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GameDataProvider", () => {
  it("loads the recipe book from the API", async () => {
    mockFetch(
      new Response(JSON.stringify({ schema: RECIPE_BOOK_SCHEMA, version: "v1", recipes: [{ id: "a" }, { id: "b" }] })),
    );
    render(
      <GameDataProvider>
        <Probe />
      </GameDataProvider>,
    );
    expect(screen.getByText("loading")).toBeDefined();
    await expect(screen.findByText("2 recipes")).resolves.toBeDefined();
  });

  it("asks for the recipe book version this app understands", async () => {
    const fetch = mockFetch(new Response(JSON.stringify({ schema: RECIPE_BOOK_SCHEMA, version: "v1", recipes: [] })));
    render(
      <GameDataProvider>
        <Probe />
      </GameDataProvider>,
    );
    await expect(screen.findByText("0 recipes")).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`/api/recipes\\?schema=${RECIPE_BOOK_SCHEMA}$`)),
    );
  });

  it("says recipes are updating, instead of crashing, when it gets a book of another version", async () => {
    mockFetch(new Response(JSON.stringify({ schema: RECIPE_BOOK_SCHEMA - 1, version: "v1", recipes: [] })));
    render(
      <GameDataProvider>
        <Probe />
      </GameDataProvider>,
    );
    await expect(screen.findByText("Recipes are updating. Try again in a minute.")).resolves.toBeDefined();
  });

  it("reports a failed load", async () => {
    mockFetch(new Response(null, { status: 502 }));
    render(
      <GameDataProvider>
        <Probe />
      </GameDataProvider>,
    );
    await expect(screen.findByText("Failed to load recipes (502)")).resolves.toBeDefined();
  });

  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useGameDataContext must be used inside GameDataProvider");
  });
});
