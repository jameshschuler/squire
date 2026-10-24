import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { buildRecipeBook, type ActivityView, type GameData } from "@squire/api/recipe-book";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const goldOre = buildRecipeBook(sample as unknown as GameData).activities[0]!;
const salt = { id: "salt_crystal", name: "Salt crystal", icon: "", quality: null, isCollectible: false, keywords: [] };

afterEach(cleanup);

describe("ActivityDetail", () => {
  it("shows the level, steps and max efficiency", async () => {
    await renderWithRouter(<ActivityDetail activity={goldOre} />);
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
    await renderWithRouter(<ActivityDetail activity={activity} />);
    expect(screen.getByText("Pickaxe")).toBeDefined();
    expect(screen.getByText("Light source").parentElement!.textContent).toBe("Light sourceMining lvl. 50");
  });

  it("links the items it uses up to their pages", async () => {
    await renderWithRouter(
      <ActivityDetail activity={{ ...goldOre, uses: [{ label: "50 × Salt crystal", level: null, item: salt }] }} />,
    );
    expect(screen.getByRole("link", { name: "50 × Salt crystal" }).getAttribute("href")).toBe("/items/salt_crystal");
  });

  it("hides Needs and Uses when there are none", async () => {
    await renderWithRouter(<ActivityDetail activity={{ ...goldOre, needs: [], uses: [] }} />);
    expect(screen.queryByRole("heading", { name: "Needs" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Uses" })).toBeNull();
  });

  it("shows where to do it", async () => {
    await renderWithRouter(<ActivityDetail activity={goldOre} />);
    expect(screen.getByText("Crown of Cinders").textContent).toBe("Crown of Cinders (Wrentmark)");
  });

  it("says when there's no known location", async () => {
    await renderWithRouter(<ActivityDetail activity={{ ...goldOre, locations: [] }} />);
    expect(screen.getByText("No known location")).toBeDefined();
  });

  it("shows two needs with the same name", async () => {
    const pickaxe = goldOre.needs[0]!;
    await renderWithRouter(<ActivityDetail activity={{ ...goldOre, needs: [pickaxe, pickaxe] }} />);
    expect(screen.getAllByText("Pickaxe")).toHaveLength(2);
  });

  it("lists drops under the main loot, then each kind of extra find", async () => {
    await renderWithRouter(<ActivityDetail activity={goldOre} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Needs", "Where", "Drops", "Gem find", "Chest"]);
    expect(screen.getByRole("link", { name: "Gold ore" }).getAttribute("href")).toBe("/items/gold_ore");
  });
});
