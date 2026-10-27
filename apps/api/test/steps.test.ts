import { describe, expect, it } from "vitest";
import { NO_STATS, stepsPerAction, type StatTotals, type WorkTarget } from "../src/gear-data/steps.js";

const hutJumping: WorkTarget = { skill: "agility", level: 25, workRequired: 53, maxWorkEfficiency: 1.5 };
const fryAPerch: WorkTarget = { skill: "cooking", level: 1, workRequired: 70, maxWorkEfficiency: 1.5 };
const rescueTeam: WorkTarget = { skill: "agility", level: 30, workRequired: 8500, maxWorkEfficiency: 1.5 };
const stats = (totals: Partial<StatTotals>): StatTotals => ({ ...NO_STATS, ...totals });

describe("stepsPerAction", () => {
  it.each([
    ["Hut jumping at Agility 25", hutJumping, 25, NO_STATS, 53],
    ["Hut jumping at Agility 40", hutJumping, 40, NO_STATS, 45],
    ["Hut jumping at 40 with a Walking stick", hutJumping, 40, stats({ workEfficiency: 0.05 }), 43],
    ["Hut jumping at 50 with +50% gear, capped", hutJumping, 50, stats({ workEfficiency: 0.5 }), 36],
    ["Fry a perch at Cooking 30 with Oven mittens", fryAPerch, 30, stats({ stepsFlat: -2 }), 54],
    [
      "Rescue team with a Good Wanderlust walking stick and a Flowing pocketwatch",
      rescueTeam,
      30,
      stats({ workEfficiency: 0.05, stepsFlat: -2, stepsPercent: -0.05 }),
      7689,
    ],
  ])("matches the wiki: %s", (_, target, level, totals, steps) => {
    expect(stepsPerAction(target, level, totals).steps).toBe(steps);
  });

  it("counts at most 20 levels over the requirement", () => {
    expect(stepsPerAction(rescueTeam, 99, NO_STATS).efficiency).toBe(1.25);
  });

  it("gives no bonus below the required level", () => {
    expect(stepsPerAction(hutJumping, 10, NO_STATS).efficiency).toBe(1);
  });

  it("has no cap when the activity has no max efficiency", () => {
    const uncapped = { ...hutJumping, maxWorkEfficiency: null };
    expect(stepsPerAction(uncapped, 25, stats({ workEfficiency: 1 })).efficiency).toBe(2);
  });

  it("never drops below 10 steps", () => {
    expect(stepsPerAction(hutJumping, 25, stats({ stepsFlat: -100 })).steps).toBe(10);
  });

  it("keeps efficiency at least 1%", () => {
    expect(stepsPerAction(hutJumping, 25, stats({ workEfficiency: -5 })).efficiency).toBe(0.01);
  });

  it("averages in double action, up to 100%", () => {
    expect(stepsPerAction(hutJumping, 25, stats({ doubleAction: 0.25 })).averageSteps).toBeCloseTo(42.4);
    expect(stepsPerAction(hutJumping, 25, stats({ doubleAction: 3 })).averageSteps).toBe(26.5);
  });
});
