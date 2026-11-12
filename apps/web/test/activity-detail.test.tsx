import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { buildRecipeBook, type ActivityView, type GameData } from "@squire/api/recipe-book";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { FAVORITES_STORAGE_KEYS } from "@/lib/favorites";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const goldOre = buildRecipeBook(sample as unknown as GameData).activities[0]!;
const salt = { id: "salt_crystal", name: "Salt crystal", icon: "", quality: null, isCollectible: false, keywords: [] };

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const renderActivity = (activity: ActivityView) =>
  renderWithRouter(
    <FavoritesProvider>
      <ActivityDetail activity={activity} />
    </FavoritesProvider>,
  );

describe("ActivityDetail", () => {
  it("shows each drop's chance, then its average steps at max work efficiency and at base rate", async () => {
    await renderActivity(goldOre);
    expect(screen.getAllByText("Every action")[0]!.getAttribute("title")).toBe(
      "Chance per action of getting at least one",
    );
    expect(screen.getByText("~40 steps · 68 at base rate").getAttribute("title")).toBe(
      "Average steps to get one, at max work efficiency and at base rate (no work efficiency)",
    );
  });

  it("shows only the chance for a drop without steps", async () => {
    const [drops] = goldOre.drops;

    await renderActivity({
      ...goldOre,
      drops: [
        {
          ...drops!,
          items: drops!.items.map((item) => ({ ...item, rate: { ...item.rate, stepsEach: null, baseSteps: null } })),
        },
      ],
    });
    expect(screen.getAllByText("Every action").length).toBeGreaterThan(0);
    expect(screen.queryByText(/at base rate/)).toBeNull();
  });

  it("shows ranges for a drop whose rate changes with skill level", async () => {
    const [drops] = goldOre.drops;
    const [gold] = drops!.items;
    const rateRange = {
      chance: { min: 0.058, max: 0.405 },
      stepsEach: { min: 116, max: 805 },
      baseSteps: { min: 140, max: 970 },
    };

    await renderActivity({ ...goldOre, drops: [{ ...drops!, items: [{ ...gold!, rateRange }] }] });
    expect(screen.getByText("5.8%–40.5% · 1 in 2–17 actions").getAttribute("title")).toBe(
      "Chance per action of getting at least one. Changes with skill level.",
    );
    expect(screen.getByText("~116–805 steps · 140–970 at base rate")).toBeDefined();
  });

  it("adds the activity to favorites", async () => {
    await renderActivity(goldOre);
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(localStorage.getItem(FAVORITES_STORAGE_KEYS.activity)).toBe('["mine_gold_ore"]');
  });

  it("shows the level, steps and max efficiency", async () => {
    await renderActivity(goldOre);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mine gold ore");
    expect(screen.getByText("Mining lvl. 40")).toBeDefined();
    expect(screen.getByText("68 base steps · 40 min steps")).toBeDefined();
    expect(screen.getByText("Max efficiency 170%")).toBeDefined();
  });

  it("lists the gear it needs, with the level a tool needs", async () => {
    const activity: ActivityView = {
      ...goldOre,
      needs: [
        ...goldOre.needs,
        { label: "Light source", level: { id: "mining", name: "Mining", level: 50 }, item: null },
      ],
    };

    await renderActivity(activity);
    expect(screen.getByText("Pickaxe")).toBeDefined();
    expect(screen.getByText("Light source").parentElement!.textContent).toBe("Light sourceMining lvl. 50");
  });

  it("links the items it uses up to their pages", async () => {
    await renderActivity({ ...goldOre, uses: [{ label: "50 × Salt crystal", level: null, item: salt }] });
    expect(screen.getByRole("link", { name: "50 × Salt crystal" }).getAttribute("href")).toBe("/items/salt_crystal");
  });

  it("hides Needs and Uses when there are none", async () => {
    await renderActivity({ ...goldOre, needs: [], uses: [] });
    expect(screen.queryByRole("heading", { name: "Needs" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Uses" })).toBeNull();
  });

  it("shows where to do it", async () => {
    await renderActivity(goldOre);
    expect(screen.getByText("Crown of Cinders").textContent).toBe("Crown of Cinders (Wrentmark)");
  });

  it("says when there's no known location", async () => {
    await renderActivity({ ...goldOre, locations: [] });
    expect(screen.getByText("No known location")).toBeDefined();
  });

  it("shows two needs with the same name", async () => {
    const pickaxe = goldOre.needs[0]!;

    await renderActivity({ ...goldOre, needs: [pickaxe, pickaxe] });
    expect(screen.getAllByText("Pickaxe")).toHaveLength(2);
  });

  it("lists drops under the main loot, then each kind of extra find", async () => {
    await renderActivity(goldOre);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

    expect(headings).toEqual(["Needs", "Where", "Drops", "Gem find", "Chest"]);
    expect(screen.getByRole("link", { name: /Gold ore/ }).getAttribute("href")).toBe("/items/gold_ore");
  });
});
