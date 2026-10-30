import { describe, expect, it } from "vitest";
import { BEST_IN_GAME, buildGearData, optimizeGear, type GearData } from "@squire/api/gear-data";
import type { GameData } from "@squire/api/recipe-book";
import sample from "../../../fixtures/api/gamedata-sample.json";
import gearItems from "../../../fixtures/api/gear.json";
import { solveGear } from "@/lib/gear-solution";

const gear: GearData = buildGearData({ ...sample, items: [...sample.items, ...gearItems] } as unknown as GameData);
const woodcutting = { skill: "woodcutting", level: 1, workRequired: 100, maxWorkEfficiency: 2, locationIds: [] };

describe("solveGear", () => {
  it("finds the set for the goals and the fewest steps possible", () => {
    const solution = solveGear({ gear, profile: BEST_IN_GAME, target: woodcutting, goals: ["xp"], tieBreakers: [] });
    expect(solution.suggestion).toEqual(optimizeGear(gear, BEST_IN_GAME, woodcutting, ["xp"]));
    expect(solution.fewestSteps).toBe(optimizeGear(gear, BEST_IN_GAME, woodcutting).result.steps);
  });

  it("works out the fewest steps per target", () => {
    const slow = { ...woodcutting, workRequired: 300 };
    const fast = solveGear({ gear, profile: BEST_IN_GAME, target: woodcutting, goals: ["steps"], tieBreakers: [] });
    const longer = solveGear({ gear, profile: BEST_IN_GAME, target: slow, goals: ["steps"], tieBreakers: [] });
    expect(longer.fewestSteps).toBeGreaterThan(fast.fewestSteps);
  });

  it("breaks ties with the extra goals but reports only the player's", () => {
    const solution = solveGear({
      gear,
      profile: BEST_IN_GAME,
      target: woodcutting,
      goals: ["steps"],
      tieBreakers: ["xp"],
    });
    const both = optimizeGear(gear, BEST_IN_GAME, woodcutting, ["steps", "xp"]);
    expect(solution.suggestion).toEqual({ ...both, goals: ["steps"] });
    expect(solution.suggestion.result.steps).toBe(optimizeGear(gear, BEST_IN_GAME, woodcutting).result.steps);
  });
});
