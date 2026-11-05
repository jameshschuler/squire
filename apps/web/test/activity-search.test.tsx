import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA, buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import { ActivitySearch } from "@/components/activities/ActivitySearch";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { GameDataProvider } from "@/contexts/game-data-context";
import { FAVORITES_STORAGE_KEYS } from "@/lib/favorites";
import { FAVORITES_FILTER } from "@/lib/list-filters";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const book = { ...buildRecipeBook(sample as unknown as GameData), schema: RECIPE_BOOK_SCHEMA };

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function renderSearch(query: string, skill?: string, onSkillChange = () => {}, data = book) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(data))),
  );
  await renderWithRouter(
    <GameDataProvider>
      <FavoritesProvider>
        <ActivitySearch query={query} skill={skill} onQueryChange={() => {}} onSkillChange={onSkillChange} />
      </FavoritesProvider>
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

describe("ActivitySearch favorites", () => {
  it("lists only favorites under the Favorites chip", async () => {
    const goldOre = book.activities[0]!;
    const twoActivities = {
      ...book,
      activities: [goldOre, { ...goldOre, id: "mine_more_gold", name: "Mine more gold" }],
    };

    localStorage.setItem(FAVORITES_STORAGE_KEYS.activity, JSON.stringify(["mine_gold_ore"]));
    await renderSearch("", FAVORITES_FILTER, () => {}, twoActivities);
    await screen.findByRole("link", { name: /Mine gold ore/ });
    expect(screen.queryByRole("link", { name: /Mine more gold/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Favorites" })).toBeDefined();
  });

  it("has no Favorites chip when only recipes are starred", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEYS.recipe, JSON.stringify(["mine_gold_ore"]));
    await renderSearch("");
    await screen.findByRole("link", { name: /Mine gold ore/ });
    expect(screen.queryByRole("button", { name: "Favorites" })).toBeNull();
  });

  it("drops the chip and the filter after clearing favorite activities", async () => {
    localStorage.setItem(FAVORITES_STORAGE_KEYS.activity, JSON.stringify(["mine_gold_ore"]));
    const onSkillChange = vi.fn();

    await renderSearch("", FAVORITES_FILTER, onSkillChange);
    fireEvent.click(await screen.findByRole("button", { name: "Clear all" }));
    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByText("Clear all favorite activities?")).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
    expect(screen.queryByRole("button", { name: "Favorites" })).toBeNull();
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.activity)).toBe("[]");
    expect(onSkillChange).toHaveBeenCalledWith(undefined);
  });
});
