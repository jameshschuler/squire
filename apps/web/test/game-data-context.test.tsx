import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GameDataProvider", () => {
  it("loads the recipe book from the API", async () => {
    mockFetch(new Response(JSON.stringify({ version: "v1", recipes: [{ id: "a" }, { id: "b" }] })));
    render(
      <GameDataProvider>
        <Probe />
      </GameDataProvider>,
    );
    expect(screen.getByText("loading")).toBeDefined();
    await expect(screen.findByText("2 recipes")).resolves.toBeDefined();
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
