import { describe, expect, it } from "vitest";
import { BEST_IN_GAME, buildGearData, optimizeGear, type GearData } from "@walkscape-community/gear-optimizer";
import type { GameData } from "@squire/api/recipe-book";
import sample from "../../../fixtures/api/gamedata-sample.json";
import gearItems from "../../../fixtures/api/gear.json";
import { solveGear } from "@/lib/gear-solution";

const gear: GearData = buildGearData({ ...sample, items: [...sample.items, ...gearItems] } as unknown as GameData);
const woodcutting = {
  skill: "woodcutting",
  level: 1,
  workRequired: 100,
  maxWorkEfficiency: 2,
  locationIds: [],
  needs: [],
  baseXp: 20,
};

describe("solveGear", () => {
  it("finds the set for the goals and the fastest set in the game", () => {
    const solution = solveGear({ gear, profile: BEST_IN_GAME, target: woodcutting, goals: ["xp"], tieBreakers: [] });
    const expected = optimizeGear(gear, BEST_IN_GAME, woodcutting, ["xp"]);

    expect(solution.suggestion).toEqual({ ...expected, searchMs: expect.any(Number) });
    expect(solution.bestInGame.result.steps).toBe(optimizeGear(gear, BEST_IN_GAME, woodcutting).result.steps);
    expect(solution.bestInGame.goals).toEqual(["steps"]);
  });

  it("works out the fastest set in the game per target", () => {
    const slow = { ...woodcutting, workRequired: 300 };
    const fast = solveGear({ gear, profile: BEST_IN_GAME, target: woodcutting, goals: ["steps"], tieBreakers: [] });
    const longer = solveGear({ gear, profile: BEST_IN_GAME, target: slow, goals: ["steps"], tieBreakers: [] });

    expect(longer.bestInGame.result.steps).toBeGreaterThan(fast.bestInGame.result.steps);
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

    expect(solution.suggestion).toEqual({ ...both, goals: ["steps"], searchMs: expect.any(Number) });
    expect(solution.suggestion.result.steps).toBe(optimizeGear(gear, BEST_IN_GAME, woodcutting).result.steps);
  });
});
