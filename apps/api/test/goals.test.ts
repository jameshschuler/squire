import { describe, expect, it } from "vitest";
import { GOALS, compareScores, goalScorer } from "../src/gear-data/goals.js";
import { NO_STATS } from "../src/gear-data/steps.js";

const result = (averageSteps: number) => ({ efficiency: 1, steps: Math.ceil(averageSteps), averageSteps });

describe("goalScorer", () => {
  it("scores fewest steps so that fewer steps is higher", () => {
    expect(goalScorer(["steps"])(result(40), NO_STATS)).toEqual([-40]);
  });

  it("scores other goals as their stat per step, so steps still count", () => {
    const totals = { ...NO_STATS, goalStats: [0.5] };
    expect(goalScorer(["chests"])(result(30), totals)).toEqual([1.5 / 30]);
  });

  it("gives each goal its own stat, in the order they were picked", () => {
    const totals = { ...NO_STATS, goalStats: [0.2, 0.4] };
    expect(goalScorer(["items", "steps", "xp"])(result(10), totals)).toEqual([1.2 / 10, -10, 1.4 / 10]);
  });
});

describe("crafting goals", () => {
  it("score saving materials and quality by the stat itself, not per step", () => {
    const totals = { ...NO_STATS, goalStats: [0.1, 40] };
    expect(goalScorer(["materials", "quality"])(result(30), totals)).toEqual([0.1, 40]);
  });
});

describe("compareScores", () => {
  it("decides by the first goal, then the next", () => {
    expect(compareScores([-30, 0.1], [-31, 0.9])).toBeGreaterThan(0);
    expect(compareScores([-30, 0.1], [-30, 0.2])).toBeLessThan(0);
  });

  it("treats tiny floating-point differences as a tie", () => {
    expect(compareScores([0.1 + 0.2], [0.3])).toBe(0);
  });

  it("is transitive, so a chain of near-ties can't drift", () => {
    const [a, b, c] = [[1], [1 + 4e-10], [1 + 8e-10]];
    const ab = compareScores(a, b) === 0;
    const bc = compareScores(b, c) === 0;
    expect(ab && bc ? compareScores(a, c) : 0).toBe(0);
  });
});

describe("GOALS", () => {
  it("has Fastest first, explaining that it counts double action", () => {
    expect(GOALS[0]).toMatchObject({ id: "steps", label: "Fastest" });
    expect(GOALS[0]?.description).toContain("double action");
  });
});
