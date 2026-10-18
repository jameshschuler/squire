import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { EffectItemListItem } from "@/components/effects/EffectItemListItem";
import type { ItemWithEffects } from "@squire/api/recipe-book";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const salmonPie: ItemWithEffects = {
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

describe("EffectItemListItem", () => {
  it("links to the food and shows the effect that helps the chosen skill", async () => {
    await renderWithRouter(
      <ul>
        <EffectItemListItem item={salmonPie} filter="woodcutting" />
      </ul>,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/items/salmon_pie");
    expect(screen.getByText("+7% work efficiency")).toBeDefined();
  });

  it("says where the food applies when no skill is chosen", async () => {
    await renderWithRouter(
      <ul>
        <EffectItemListItem item={salmonPie} filter={undefined} />
      </ul>,
    );
    expect(screen.getByText("Woodcutting")).toBeDefined();
    expect(screen.queryByText(/work efficiency/)).toBeNull();
  });
});
