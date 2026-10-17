import { describe, expect, it } from "vitest";
import { groupByCondition } from "@/lib/effects";

const effect = (condition: string, stat: string) => ({ condition, stat, normal: "+1%", fine: "+2%" });

describe("groupByCondition", () => {
  it("groups effects under their condition, in the order they first appear", () => {
    const shark = effect("While doing Woodcutting", "Steps required");
    const rewards = effect("While doing Woodcutting", "Double rewards");
    const global = effect("Global", "Bonus experience");
    expect(groupByCondition([shark, global, rewards])).toEqual([
      ["While doing Woodcutting", [shark, rewards]],
      ["Global", [global]],
    ]);
  });

  it("returns no groups for no effects", () => {
    expect(groupByCondition([])).toEqual([]);
  });
});
