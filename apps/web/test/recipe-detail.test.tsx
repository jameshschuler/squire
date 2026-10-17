import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { buildRecipeBook, type RecipeView, type GameData } from "@squire/api/recipe-book";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";
import { FavoritesProvider } from "@/contexts/favorites-context";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const goldBar = buildRecipeBook(sample as unknown as GameData).recipes.find((r) => r.id === "smelt_a_gold_bar")!;

afterEach(cleanup);

const renderRecipe = (recipe: RecipeView) =>
  renderWithRouter(
    <FavoritesProvider>
      <RecipeDetail recipe={recipe} />
    </FavoritesProvider>,
  );

describe("RecipeDetail", () => {
  it("shows the steps and max efficiency", async () => {
    await renderRecipe(goldBar);
    expect(screen.getByText(/base steps/)).toBeDefined();
    expect(screen.getByText(/Max efficiency/)).toBeDefined();
  });

  it("hides the steps and max efficiency when the game data has none", async () => {
    await renderRecipe({ ...goldBar, workRequired: null, maxWorkEfficiency: null });
    expect(screen.queryByText(/base steps/)).toBeNull();
    expect(screen.queryByText(/Max efficiency/)).toBeNull();
  });

  it("shows base steps alone when the max efficiency is unknown", async () => {
    await renderRecipe({ ...goldBar, workRequired: 110, maxWorkEfficiency: null });
    expect(screen.getByText("110 base steps")).toBeDefined();
    expect(screen.queryByText(/Max efficiency/)).toBeNull();
  });

  it("hides only the steps when the work needed is unknown", async () => {
    await renderRecipe({ ...goldBar, workRequired: null });
    expect(screen.queryByText(/base steps/)).toBeNull();
    expect(screen.getByText(/Max efficiency/)).toBeDefined();
  });

  it("shows the effects of a food it makes", async () => {
    const effects = { steps: 500, lines: ["Global +1% double rewards (fine: +2%)"] };
    await renderRecipe({ ...goldBar, outputs: [{ ...goldBar.outputs[0]!, effects }] });
    expect(screen.getByRole("heading", { name: "Effects" })).toBeDefined();
    expect(screen.getByText("Global +1% double rewards (fine: +2%)")).toBeDefined();
    expect(screen.getByText("Lasts 500 steps")).toBeDefined();
  });

  it("has no effects section for a recipe that doesn't make food", async () => {
    await renderRecipe(goldBar);
    expect(screen.queryByRole("heading", { name: "Effects" })).toBeNull();
  });
});
