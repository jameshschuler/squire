import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { buildRecipeBook, findItem, type GameData } from "@jameshschuler/walkscape-sdk";
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
  it("shows what uses a crafted item, then its recipe, and no sources section when nothing drops it", async () => {
    await renderItem("gold_bar");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gold bar");
    expect(sectionTitles()).toEqual(["Used in", "Made by"]);
    expect(section("Made by").getByRole("link", { name: /Smelt a gold bar/ })).toBeDefined();
    expect(section("Used in").getByText("No recipe uses this.")).toBeDefined();
  });

  it("shows what uses a raw material, then where to get it, with its activity and location", async () => {
    await renderItem("gold_ore");
    expect(sectionTitles()).toEqual(["Used in", "Where to get it"]);
    const sources = section("Where to get it");
    expect(sources.getByText("Mine gold ore")).toBeDefined();
    expect(sources.getByText("Mining lvl. 40")).toBeDefined();
    expect(sources.getByText("Crown of Cinders").textContent).toBe("Crown of Cinders (Wrentmark)");
    expect(section("Used in").getByRole("link", { name: /Smelt a gold bar/ })).toBeDefined();
  });

  it("says when a raw material has no known source", async () => {
    await renderItem("salt_crystal");
    expect(sectionTitles()).toEqual(["Used in", "Where to get it"]);
    expect(section("Where to get it").getByText("No known source yet.")).toBeDefined();
  });
});
