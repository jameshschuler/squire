import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { buildRecipeBook, findItem, type GameData } from "@squire/walkscape-sdk";
import { ItemDetail } from "@/components/items/ItemDetail";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const { recipes } = buildRecipeBook(sample as unknown as GameData);

afterEach(cleanup);

async function renderItem(itemId: string) {
  await renderWithRouter(<ItemDetail item={findItem(recipes, itemId)!} recipes={recipes} />);
}

function section(title: string) {
  return within(screen.getByRole("heading", { name: title }).parentElement!);
}

describe("ItemDetail", () => {
  it("lists the recipe that makes an item and says nothing uses it", async () => {
    await renderItem("gold_bar");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gold bar");
    expect(section("Made by").getByRole("link", { name: /Smelt a gold bar/ })).toBeDefined();
    expect(section("Used in").getByText("No recipe uses this.")).toBeDefined();
  });

  it("lists recipes that use a gathered material and says nothing makes it", async () => {
    await renderItem("salt_crystal");
    expect(section("Made by").getByText(/No recipe makes this/)).toBeDefined();
    expect(section("Used in").getByRole("link", { name: /Assemble dynamite/ })).toBeDefined();
  });
});
