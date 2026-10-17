import type { ItemDetail } from "@jameshschuler/walkscape-data-client";
import { describe, expect, it } from "vitest";
import { itemEffects } from "../src/recipe-book/effects.js";
import foods from "../../../fixtures/api/foods.json";

const food = (id: string) => (foods as unknown as ItemDetail[]).find((f) => f.id === id)!;

describe("itemEffects", () => {
  it.each([
    ["salmon_pie", 1000, [{ text: "+7% work efficiency while Woodcutting", fine: "+14%" }]],
    ["bagel", 1000, [{ text: "+5% work efficiency while Agility", fine: null }]],
    [
      "beer",
      1000,
      [
        { text: "Global -4% bonus experience", fine: null },
        { text: "Global +2% double rewards", fine: "+4%" },
      ],
    ],
    ["bread", 1000, [{ text: "+10% work efficiency while travelling", fine: "+25%" }]],
    [
      "crab_rolls",
      750,
      [
        { text: "25% chance to find 1 to 10 gold pieces while Foraging", fine: "50%" },
        { text: "25% chance to find 1 to 10 gold pieces while Hunting", fine: "50%" },
      ],
    ],
    ["dried_fruit", 5000, [{ text: "+6% double action in gathering skills", fine: "+9%" }]],
    ["bug_bait", 5000, [{ text: "-1 steps required while Fishing", fine: "-2" }]],
    ["beef_stew", 10000, [{ text: "Global +5 inventory space", fine: "+10" }]],
  ])("describes %s's buff from its stats", (id, steps, effects) => {
    expect(itemEffects(food(id))).toEqual({ steps, effects });
  });

  it("ignores the game's effect text, which can contradict the stats", () => {
    const bagel = structuredClone(food("bagel"));
    const buffs = bagel.type === "consumable" ? bagel.buffs! : [];
    buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.text = "Chance to find <hl>1</hl> fishing bait";
    expect(itemEffects(bagel)?.effects).toEqual([{ text: "+5% work efficiency while Agility", fine: null }]);
  });

  it("has no effects for items that aren't consumables", () => {
    expect(itemEffects({ ...food("bagel"), type: "material" } as unknown as ItemDetail)).toBeNull();
  });
});
