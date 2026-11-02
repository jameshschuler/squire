import { describe, expect, it } from "vitest";
import { GOALS, compareScores, goalScorer, goalStats, goalValue, marginHolds, marginOf } from "../src/goals.js";
import type { GoalId } from "../src/goals.js";
import { NO_STATS } from "../src/steps.js";

const BASE_XP = 22;
const result = (averageSteps: number) => ({ efficiency: 1, steps: Math.ceil(averageSteps), averageSteps });

describe("goalScorer", () => {
  it("scores fewest steps so that fewer steps is higher", () => {
    expect(goalScorer(["steps"], BASE_XP)(result(40), NO_STATS)).toEqual([-40]);
  });

  it("scores other goals as their stat per step, so steps still count", () => {
    const totals = { ...NO_STATS, goalStats: [0.5] };

    expect(goalScorer(["chests"], BASE_XP)(result(30), totals)).toEqual([1.5 / 30]);
  });

  it("gives each goal its own stat, in the order they were picked", () => {
    const totals = { ...NO_STATS, goalStats: [0.2, 0.4] };

    expect(goalScorer(["items", "steps", "xp"], BASE_XP)(result(10), totals)).toEqual([1.2 / 10, -10, 1.4 / 10]);
  });
});

describe("crafting goals", () => {
  it("score saving materials as outputs per material and quality by the stat, neither per step", () => {
    const totals = { ...NO_STATS, goalStats: [0.2, 0.1, 40] };

    expect(goalScorer(["materials", "quality"], BASE_XP)(result(30), totals)).toEqual([1.2 / 0.9, 40]);
  });

  it.each([
    ["a refund", [0, 0.2]],
    ["a doubled craft", [0.25, 0]],
  ])("counts %s as saving materials", (_, goalStats) => {
    const nothing = goalScorer(["materials"], BASE_XP)(result(30), { ...NO_STATS, goalStats: [0, 0] });
    const saved = goalScorer(["materials"], BASE_XP)(result(30), { ...NO_STATS, goalStats });

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
    expect(goalValue(["chests", "materials"], "materials", BASE_XP)([0.5, 0.2, 0.1])).toBeCloseTo(1.2 / 0.9);
  });

  it.each([
    ["flat bonus XP adds to the base", [0, 2], 24 / 22 - 1],
    ["percent bonus XP multiplies it", [0.06, 0], 0.06],
    ["both, with the percent applied to the flat bonus too", [0.06, 2], (24 * 1.06) / 22 - 1],
  ])("values most XP as the XP over base: %s", (_, stats, bonus) => {
    expect(goalValue(["xp"], "xp", BASE_XP)(stats)).toBeCloseTo(bonus);
  });

  it("counts only the percent bonus when the action has no base XP", () => {
    expect(goalValue(["xp"], "xp", 0)([0.06, 2])).toBe(0.06);
  });

  it("weighs +2 flat XP above +6% on a 22 XP action, like the game", () => {
    const xp = goalScorer(["xp"], BASE_XP);
    const flat = xp(result(30), { ...NO_STATS, goalStats: [0, 2] });
    const percent = xp(result(30), { ...NO_STATS, goalStats: [0.06, 0] });

    expect(compareScores(flat, percent)).toBeGreaterThan(0);
  });

  it("isn't divided by steps for a per-step goal", () => {
    expect(goalValue(["xp"], "xp", BASE_XP)([0.4])).toBeCloseTo(0.4);
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

  it.each([
    [-337.7049180327869, -337.704918032787, 0],
    [0.003790291262135922, 0.00379029126213592, 0],
    [123456789, 123456790, -1],
    [-15.5642023, -15.5642024, 1],
    [1e-12, 1.0000000001e-12, 0],
    [0, -0, 0],
    [0, 1e-300, -1],
    [1e-305, 2e-305, -1],
    [-1.0000000005, 1.0000000005, -1],
  ])("rounds to 9 significant digits whatever the size or sign (%s vs %s)", (left, right, sign) => {
    expect(Math.sign(compareScores([left], [right]))).toBe(sign);
  });

  it("is transitive, so a chain of near-ties can't drift", () => {
    const [first, second, third] = [[1], [1 + 4e-10], [1 + 8e-10]];
    const firstTiesSecond = compareScores(first, second) === 0;
    const secondTiesThird = compareScores(second, third) === 0;

    expect(firstTiesSecond && secondTiesThird ? compareScores(first, third) : 0).toBe(0);
  });
});

describe("GOALS", () => {
  it("has Fastest first, explaining that it counts double action", () => {
    expect(GOALS[0]).toMatchObject({ id: "steps", label: "Fastest" });
    expect(GOALS[0]?.description).toContain("double action");
  });
});
