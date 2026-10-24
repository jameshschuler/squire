import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA, buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import { ActivitySearch } from "@/components/activities/ActivitySearch";
import { GameDataProvider } from "@/contexts/game-data-context";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const book = { ...buildRecipeBook(sample as unknown as GameData), schema: RECIPE_BOOK_SCHEMA };

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function renderSearch(query: string, skill?: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(book))),
  );
  await renderWithRouter(
    <GameDataProvider>
      <ActivitySearch query={query} skill={skill} onQueryChange={() => {}} onSkillChange={() => {}} />
    </GameDataProvider>,
  );
}

describe("ActivitySearch", () => {
  it("lists activities with their skill level, linking to each", async () => {
    await renderSearch("");
    const link = await screen.findByRole("link", { name: /Mine gold ore/ });
    expect(link.getAttribute("href")).toBe("/activities/mine_gold_ore");
    expect(link.textContent).toContain("Mining lvl. 40");
  });

  it("leaves the gear an activity needs off the list", async () => {
    await renderSearch("");
    const link = await screen.findByRole("link", { name: /Mine gold ore/ });
    expect(link.textContent).not.toContain("Pickaxe");
  });

  it("finds an activity by what it drops", async () => {
    await renderSearch("sun stone");
    expect(await screen.findByRole("link", { name: /Mine gold ore/ })).toBeDefined();
  });

  it("offers a filter chip for each skill", async () => {
    await renderSearch("");
    expect(await screen.findByRole("button", { name: "Mining" })).toBeDefined();
  });

  it("says when nothing matches", async () => {
    await renderSearch("nonsense");
    expect(await screen.findByText("No activities match.")).toBeDefined();
  });
});
