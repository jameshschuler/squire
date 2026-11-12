import type { ItemDetail } from "@walkscape-community/data-api-client";
import type { ItemSummary } from "./game-data.js";
import { gearStats } from "./items.js";
import type { FoodView } from "./types.js";

type FoodDetail = Extract<ItemDetail, { type: "consumable" }>;

export function foodViews(items: ItemDetail[], summary: (id: string) => ItemSummary): FoodView[] {
  return items
    .filter(
      (item): item is FoodDetail =>
        item.type === "consumable" && item.consumableType === "food" && Boolean(item.buffs?.length),
    )
    .map((food) => {
      const groups = food.buffs!.flatMap((buff) =>
        buff.data.filter((data) => data.type === "normal").flatMap((data) => data.buffs),
      );

      return {
        ...summary(food.id),
        stats: gearStats(groups.flatMap((group) => group.attributes)),
        fineStats: food.canBeFine
          ? gearStats(
              groups.flatMap((group) =>
                group.attributes.map((attribute, index) => group.fineAttributes[index] ?? attribute),
              ),
            )
          : null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
