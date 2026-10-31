import { describe, expect, it } from "vitest";
import {
  GOALS,
  compareScores,
  goalScorer,
  goalStats,
  goalValue,
  marginHolds,
  marginOf,
} from "../src/gear-data/goals.js";
import type { GoalId } from "../src/gear-data/goals.js";
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
  it("score saving materials as outputs per material and quality by the stat, neither per step", () => {
    const totals = { ...NO_STATS, goalStats: [0.2, 0.1, 40] };
    expect(goalScorer(["materials", "quality"])(result(30), totals)).toEqual([1.2 / 0.9, 40]);
  });

  it.each([
    ["a refund", [0, 0.2]],
    ["a doubled craft", [0.25, 0]],
  ])("counts %s as saving materials", (_, goalStats) => {
    const nothing = goalScorer(["materials"])(result(30), { ...NO_STATS, goalStats: [0, 0] });
    const saved = goalScorer(["materials"])(result(30), { ...NO_STATS, goalStats });
    expect(compareScores(saved, nothing)).toBeGreaterThan(0);
    expect(saved).toEqual([1.25]);
  });

  it("shares the double rewards stat with most items", () => {
    expect(goalStats(["items", "materials"])).toEqual([
      { stat: "doubleRewards", isPercent: true },
      { stat: "noMaterialsConsumed", isPercent: true },
    ]);
  });
});

describe("goalValue", () => {
  it("values a goal from its own stats, wherever they sit among the chosen goals", () => {
    expect(goalValue(["chests", "materials"], "materials")([0.5, 0.2, 0.1])).toBeCloseTo(1.2 / 0.9);
  });

  it("isn't divided by steps for a per-step goal", () => {
    expect(goalValue(["xp"], "xp")([0.4])).toBe(0.4);
  });
});

describe("marginOf", () => {
  it.each([
    ["nothing was cut", [-40], null, null],
    ["nothing cut can beat the set", [-40], [-41], null],
    ["the best possible ties the set", [-40, 0.2], [-40, 0.2], null],
    ["a cut set could take fewer steps", [-44], [-40], { goal: "steps", gap: 0.1 }],
    ["steps are proven but chests could be higher", [-40, 0.18], [-40, 0.2], { goal: "chests", gap: 0.1 }],
    ["the best possible is zero", [-40, -0.5], [-40, 0], { goal: "chests", gap: 1 }],
  ] as const)("when %s", (_, found, ceiling, margin) => {
    const result = marginOf(["steps", "chests"], [...found], ceiling && [...ceiling]);
    if (margin) {
      expect(result?.goal).toBe(margin.goal);
      expect(result?.gap).toBeCloseTo(margin.gap);
    } else {
      expect(result).toBeNull();
    }
  });

  it("ignores goals past the ones it's asked to check", () => {
    expect(marginOf(["steps"], [-40, 0.18], [-40, 0.2])).toBeNull();
  });
});

describe("marginHolds", () => {
  const goals: GoalId[] = ["steps", "chests"];
  it.each([
    ["the set is the best", null, [-40, 0.2], [-40, 0.2], true],
    ["a proven set is beaten", null, [-40, 0.2], [-38, 0.2], false],
    ["the real gap fits the claimed one", { goal: "steps", gap: 0.1 }, [-44], [-41], true],
    ["the real gap is wider than claimed", { goal: "steps", gap: 0.05 }, [-44], [-40], false],
    [
      "only a later goal was uncertain, but an earlier one is beaten",
      { goal: "chests", gap: 0.5 },
      [-44, 0],
      [-40, 0],
      false,
    ],
    [
      "an earlier goal was uncertain and a later one is beaten",
      { goal: "steps", gap: 0.01 },
      [-40, 0.1],
      [-40, 0.2],
      true,
    ],
  ] as const)("says whether the margin holds when %s", (_, claimed, found, best, holds) => {
    expect(marginHolds(goals, claimed, [...found], [...best])).toBe(holds);
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
