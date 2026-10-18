import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA, type ItemWithEffects } from "@squire/api/recipe-book";
import { EffectItemSearch } from "@/components/effects/EffectItemSearch";
import { GameDataProvider } from "@/contexts/game-data-context";
import { renderWithRouter } from "./render-with-router";

const item = (name: string, quality: ItemWithEffects["quality"]): ItemWithEffects => ({
  id: name.toLowerCase(),
  name,
  icon: "",
  quality,
  keywords: [],
  effects: {
    steps: null,
    tiers: [],
    effects: [{ condition: "Global", scope: null, stat: "Work efficiency", normal: "+1%", fine: null, appliesTo: [] }],
  },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EffectItemSearch", () => {
  it.each([
    ["loot", "Wrench", "rare", true],
    ["foods", "Bread", "common", false],
  ] as const)("on %s, shows the tier: %s", async (kind, name, quality, shown) => {
    const book = { schema: RECIPE_BOOK_SCHEMA, version: "v1", recipes: [], sources: {}, foods: [], loot: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ...book, [kind]: [item(name, quality)] }))),
    );
    await renderWithRouter(
      <GameDataProvider>
        <EffectItemSearch
          kind={kind}
          noun={kind}
          query=""
          skill={undefined}
          onQueryChange={() => {}}
          onSkillChange={() => {}}
        />
      </GameDataProvider>,
    );
    await screen.findByText(name);
    expect(screen.queryByText(quality) !== null).toBe(shown);
  });
});
