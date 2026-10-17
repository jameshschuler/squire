import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { buildRecipeBook, findItem, type GameData } from "@squire/api/recipe-book";
import { ItemDetail } from "@/components/items/ItemDetail";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const book = buildRecipeBook(sample as unknown as GameData);

afterEach(cleanup);

async function renderItem(itemId: string) {
  await renderWithRouter(<ItemDetail item={findItem(book.recipes, itemId)!} book={book} />);
}

const sectionTitles = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

function section(title: string) {
  return within(screen.getByRole("heading", { name: title }).parentElement!);
}

describe("ItemDetail", () => {
  it("shows a crafted item's recipe, then what uses it, and no sources section when nothing drops it", async () => {
    await renderItem("gold_bar");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gold bar");
    expect(sectionTitles()).toEqual(["Keywords", "Made by", "Used in"]);
    expect(section("Made by").getByRole("link", { name: /Smelt a gold bar/ })).toBeDefined();
    expect(section("Used in").getByText("No recipe uses this.")).toBeDefined();
  });

  it("shows what uses a raw material, then where to get it, with its activity and location", async () => {
    await renderItem("gold_ore");
    expect(sectionTitles()).toEqual(["Keywords", "Used in", "Where to get it"]);
    const sources = section("Where to get it");
    expect(sources.getByText("Mine gold ore")).toBeDefined();
    expect(sources.getByText("Mining lvl. 40")).toBeDefined();
    expect(sources.getByText("Crown of Cinders").textContent).toBe("Crown of Cinders (Wrentmark)");
    expect(section("Used in").getByRole("link", { name: /Smelt a gold bar/ })).toBeDefined();
  });

  it("says when a raw material has no known source", async () => {
    await renderItem("salt_crystal");
    expect(sectionTitles()).toEqual(["Keywords", "Used in", "Where to get it"]);
    expect(section("Where to get it").getByText("No known source yet.")).toBeDefined();
  });

  it("lists the item's in-game keywords", async () => {
    await renderItem("gold_nugget");
    expect(
      section("Keywords")
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["nugget", "light"]);
  });

  it("shows what a food does right after its keywords", async () => {
    const goldBar = findItem(book.recipes, "gold_bar")!;
    const effects = { steps: 1000, lines: ["+7% work efficiency while Woodcutting (fine: +14%)"] };
    await renderWithRouter(<ItemDetail item={{ ...goldBar, effects }} book={book} />);
    expect(sectionTitles().slice(0, 2)).toEqual(["Keywords", "Effects"]);
    expect(section("Effects").getByText("+7% work efficiency while Woodcutting (fine: +14%)")).toBeDefined();
    expect(section("Effects").getByText("Lasts 1,000 steps")).toBeDefined();
  });
});
