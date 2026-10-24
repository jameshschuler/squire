import { describe, expect, it } from "vitest";
import type { ItemWithEffects } from "@squire/api/recipe-book";
import { collectionOf, collectionProgress } from "@/lib/collectibles";

const item = (id: string, name: string, isCollectible = true) => ({ id, name, isCollectible }) as ItemWithEffects;

const loot = [item("b", "Bubble bauble"), item("w", "Wrench", false), item("a", "Ancient ankh")];

describe("collectionOf", () => {
  it("lists only collectibles, A–Z, marking the ones owned", () => {
    expect(collectionOf(loot, ["b"]).map(({ item, owned }) => [item.name, owned])).toEqual([
      ["Ancient ankh", false],
      ["Bubble bauble", true],
    ]);
  });

  it("ignores owned ids that aren't collectibles in the game data", () => {
    expect(collectionProgress(collectionOf(loot, ["w", "gone"]))).toBe("0 of 2");
  });

  it("counts what's owned out of the game's total", () => {
    expect(collectionProgress(collectionOf(loot, ["a", "b"]))).toBe("2 of 2");
  });
});
