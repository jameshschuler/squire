import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { GEAR_DATA_SCHEMA } from "@walkscape-community/gear-optimizer";
import { RECIPE_BOOK_SCHEMA } from "@squire/api/recipe-book";
import { AboutPage } from "@/components/about/AboutPage";
import { GameDataProvider } from "@/contexts/game-data-context";
import { renderWithRouter } from "./render-with-router";

const book = {
  schema: RECIPE_BOOK_SCHEMA,
  version: "9a8c9f0a",
  updatedAt: "2026-11-01T14:05:00.000Z",
  recipes: [],
  activities: [],
  foods: [],
  loot: [],
  gear: [],
  sources: {},
};

const serve = (response: () => Promise<Response>) => vi.stubGlobal("fetch", vi.fn(response));
const renderPage = () =>
  renderWithRouter(
    <GameDataProvider>
      <AboutPage />
    </GameDataProvider>,
  );
const dataRows = () =>
  Object.fromEntries(
    [...screen.getByRole("region", { name: "Data" }).querySelectorAll("dl > div")].map((row) => [
      row.querySelector("dt")?.textContent,
      row.querySelector("dd")?.textContent,
    ]),
  );

beforeEach(() => serve(() => new Promise<Response>(() => {})));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AboutPage", () => {
  it("credits WalkScape and says Squire is unofficial", async () => {
    await renderPage();
    expect(screen.getByText(/Game data and icons © WalkScape\. Squire is an unofficial fan tool/)).toBeDefined();
  });

  it.each([
    ["WalkScape", "https://walkscape.app"],
    ["Wiki", "https://wiki.walkscape.app/wiki/WalkScape:_Grind_by_walking!"],
    ["Discord", "https://discord.gg/Kk6VecJFEk"],
    ["Source code", "https://github.com/jameshschuler/squire"],
  ])("links to %s in a new tab", async (name, href) => {
    await renderPage();
    const link = screen.getByRole("link", { name });

    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("has a way back", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Back" })).toBeDefined();
  });

  it("shows the game data version, when it was updated, and the data schemas", async () => {
    serve(async () => new Response(JSON.stringify(book)));
    await renderPage();
    await screen.findByText("9a8c9f0a");
    expect(dataRows()).toEqual({
      "Game data version": "9a8c9f0a",
      Updated: "Nov 1, 2026, 2:05 PM",
      "Recipe book schema": String(RECIPE_BOOK_SCHEMA),
      "Gear data schema": String(GEAR_DATA_SCHEMA),
    });
  });

  it("says the game data is loading until it arrives", async () => {
    await renderPage();
    expect(dataRows()).toMatchObject({ "Game data version": "Loading…", Updated: "Loading…" });
  });

  it("says when the game data couldn't load", async () => {
    serve(async () => new Response("", { status: 500 }));
    await renderPage();
    await screen.findAllByText("Couldn't load");
    expect(dataRows()).toMatchObject({ "Game data version": "Couldn't load", Updated: "Couldn't load" });
  });
});
