import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { FoodListItem } from "@/components/food/FoodListItem";
import type { Food } from "@squire/api/recipe-book";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const salmonPie: Food = {
  id: "salmon_pie",
  name: "Salmon pie",
  icon: "",
  keywords: [],
  effects: {
    steps: 1000,
    effects: [
      {
        condition: "While doing Woodcutting",
        stat: "Work efficiency",
        normal: "+7%",
        fine: "+14%",
        appliesTo: [{ id: "woodcutting", name: "Woodcutting" }],
      },
    ],
  },
};

describe("FoodListItem", () => {
  it("links to the food and shows the effect that helps the chosen skill", async () => {
    await renderWithRouter(
      <ul>
        <FoodListItem food={salmonPie} filter="woodcutting" />
      </ul>,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/items/salmon_pie");
    expect(screen.getByText("+7% work efficiency")).toBeDefined();
  });

  it("says where the food applies when no skill is chosen", async () => {
    await renderWithRouter(
      <ul>
        <FoodListItem food={salmonPie} filter={undefined} />
      </ul>,
    );
    expect(screen.getByText("Woodcutting")).toBeDefined();
    expect(screen.queryByText(/work efficiency/)).toBeNull();
  });
});
