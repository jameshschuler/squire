import type { ItemDetail } from "@jameshschuler/walkscape-data-client";
import { describe, expect, it } from "vitest";
import { itemEffects } from "../src/recipe-book/effects.js";
import foods from "../../../fixtures/api/foods.json";

const food = (id: string) => (foods as unknown as ItemDetail[]).find((f) => f.id === id)!;

describe("itemEffects", () => {
  const effect = (condition: string, stat: string, normal: string, fine = normal) => ({
    condition,
    stat,
    normal,
    fine,
  });

  it.each([
    ["salmon_pie", 1000, [effect("While doing Woodcutting", "Work efficiency", "+7%", "+14%")]],
    ["bagel", 1000, [effect("While doing Agility", "Work efficiency", "+5%")]],
    ["beer", 1000, [effect("Global", "Bonus experience", "-4%"), effect("Global", "Double rewards", "+2%", "+4%")]],
    ["bread", 1000, [effect("While travelling", "Work efficiency", "+10%", "+25%")]],
    [
      "crab_rolls",
      750,
      [
        effect("While doing Foraging", "Chance to find 1 to 10 gold pieces", "25%", "50%"),
        effect("While doing Hunting", "Chance to find 1 to 10 gold pieces", "25%", "50%"),
      ],
    ],
    ["dried_fruit", 5000, [effect("While doing gathering skills", "Double action", "+6%", "+9%")]],
    ["bug_bait", 5000, [effect("While doing Fishing", "Steps required", "-1", "-2")]],
    ["beef_stew", 10000, [effect("Global", "Inventory space", "+5", "+10")]],
  ])("describes %s's buff from its stats", (id, steps, effects) => {
    expect(itemEffects(food(id))).toEqual({ steps, effects });
  });

  it("ignores the game's effect text, which can contradict the stats", () => {
    const bagel = structuredClone(food("bagel"));
    const buffs = bagel.type === "consumable" ? bagel.buffs! : [];
    buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.text = "Chance to find <hl>1</hl> fishing bait";
    expect(itemEffects(bagel)?.effects).toEqual([effect("While doing Agility", "Work efficiency", "+5%")]);
  });

  it("has no effects for items that aren't consumables", () => {
    expect(itemEffects({ ...food("bagel"), type: "material" } as unknown as ItemDetail)).toBeNull();
  });
});
