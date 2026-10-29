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
  it("says nothing when gear helps and the level is fine", () => {
    expect(answerNotes(suggestion(30), target, 50)).toEqual([]);
  });

  it("says when the character's level is too low", () => {
    expect(answerNotes(suggestion(30), target, 20)).toEqual([
      "You need Mining level 40 for this. Here's the set for when you get there.",
    ]);
  });

  it("says when no gear helps", () => {
    expect(answerNotes(suggestion(80, 0), target, null)).toEqual(["No gear helps with this."]);
  });

  it("says both when the level is too low and no gear helps", () => {
    expect(answerNotes(suggestion(80, 0), target, 20)).toEqual([
      "You need Mining level 40 for this. Here's the set for when you get there.",
      "No gear helps with this.",
    ]);
  });
});

describe("stepsTile", () => {
  const result: StepsResult = { efficiency: 1.5, steps: 40, averageSteps: 32 };
  const withGoals = (goals: string[]) => ({ result, goals }) as unknown as GearSuggestion;

  it.each([
    [["steps", "chests"], true],
    [["chests"], false],
  ])("highlights the steps tile for goals %j: %s", (goals, highlight) => {
    expect(stepsTile(withGoals(goals), result).highlight).toBe(highlight);
  });

  it.each([
    [{ efficiency: 1, steps: 48, averageSteps: 48 }, ["32 on average with double action", "8 fewer than with no gear"]],
    [{ efficiency: 1, steps: 40, averageSteps: 40 }, ["32 on average with double action"]],
  ])("compares steps with no gear (%j)", (noGear, details) => {
    expect(stepsTile(withGoals(["steps"]), noGear)).toEqual({
      key: "steps",
      value: "40",
      label: "Steps per action",
      details,
      highlight: true,
    });
  });

  it("leaves out the average when there's no double action", () => {
    const plain = { result: { efficiency: 1, steps: 40, averageSteps: 40 }, goals: [] } as unknown as GearSuggestion;
    expect(stepsTile(plain, plain.result).details).toEqual([]);
  });
});
