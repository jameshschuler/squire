import { describe, expect, it } from "vitest";
import type { GearSuggestion, StepsResult } from "@squire/api/gear-data";
import { answerNotes, stepsTile } from "@/lib/gear-answer";
import type { GearTarget } from "@/lib/gear-targets";

const target: GearTarget = {
  key: "activity:mine",
  name: "Mine",
  icon: "",
  skill: { id: "mining", name: "Mining", level: 40 },
  workRequired: 100,
  maxWorkEfficiency: 1.5,
  locations: [],
  lootTypes: [],
  kind: "activity",
  makesTieredGear: false,
};
const steps = (averageSteps: number): StepsResult => ({ efficiency: 1, steps: Math.ceil(averageSteps), averageSteps });
const suggestion = (averageSteps: number, picks = 1): GearSuggestion =>
  ({
    location: null,
    picks: Array(picks).fill({}),
    pet: null,
    totals: {},
    result: steps(averageSteps),
  }) as unknown as GearSuggestion;

describe("answerNotes", () => {
  it("says nothing when the set is an improvement and the level is fine", () => {
    expect(answerNotes(suggestion(30), target, steps(40), 50)).toEqual([]);
  });

  it("says when the character's level is too low", () => {
    expect(answerNotes(suggestion(30), target, null, 20)).toEqual([
      "You need Mining level 40 for this. Here's the set for when you get there.",
    ]);
  });

  it("says when the character already wears the best set, allowing for rounding", () => {
    expect(answerNotes(suggestion(30), target, steps(30 + 1e-12), 50)).toEqual([
      "You're already wearing the best set for this.",
    ]);
  });

  it("says the current gear is best when it beats the suggestion", () => {
    expect(answerNotes(suggestion(30, 0), target, steps(25), 50)).toEqual([
      "You're already wearing the best set for this.",
    ]);
  });

  it("says when no gear helps", () => {
    expect(answerNotes(suggestion(80, 0), target, null, null)).toEqual(["No gear helps with this."]);
  });
});

describe("stepsTile", () => {
  const result: StepsResult = { efficiency: 1.5, steps: 40, averageSteps: 32 };
  const withGoals = (goals: string[]) => ({ result, goals }) as unknown as GearSuggestion;

  it.each([
    [["steps", "chests"], true],
    [["chests"], false],
  ])("highlights the steps tile for goals %j: %s", (goals, highlight) => {
    expect(stepsTile(withGoals(goals), null).highlight).toBe(highlight);
  });

  it.each([
    [null, "Steps · 32 avg"],
    [{ efficiency: 1, steps: 40, averageSteps: 40 }, "Steps · 32 avg · −8 vs now"],
    [{ efficiency: 1, steps: 30, averageSteps: 32.2 }, "Steps · 32 avg · same as now"],
    [{ efficiency: 1, steps: 30, averageSteps: 30 }, "Steps · 32 avg · +2 vs now"],
  ])("compares average steps with what's worn now (%j)", (before, label) => {
    expect(stepsTile(withGoals(["steps"]), before)).toMatchObject({ key: "steps", value: "40", label });
  });

  it("leaves out the average when there's no double action", () => {
    const plain = { result: { efficiency: 1, steps: 40, averageSteps: 40 }, goals: [] } as unknown as GearSuggestion;
    expect(stepsTile(plain, null).label).toBe("Steps");
  });
});
