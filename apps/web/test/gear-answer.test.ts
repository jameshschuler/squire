import { describe, expect, it } from "vitest";
import type { GearSuggestion, StepsResult } from "@squire/api/gear-data";
import { answerNotes } from "@/lib/gear-answer";
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
