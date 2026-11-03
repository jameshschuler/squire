import { describe, expect, it } from "vitest";
import type { GearSuggestion, GoalId, Margin, StepsResult } from "@walkscape-community/gear-optimizer";
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
  needs: [],
  baseXp: 20,
};
const steps = (averageSteps: number): StepsResult => ({ efficiency: 1, steps: Math.ceil(averageSteps), averageSteps });
const suggestion = (
  averageSteps: number,
  picks = 1,
  margin: Margin | null = null,
  goals: GoalId[] = ["steps"],
): GearSuggestion =>
  ({
    location: null,
    picks: Array(picks).fill({}),
    pet: null,
    totals: {},
    result: steps(averageSteps),
    goals,
    margin,
    missingNeeds: [],
  }) as unknown as GearSuggestion;

describe("answerNotes", () => {
  it("adds no note when the set is proven best and the level is fine", () => {
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

  it("only says no gear was found, with the margin, when an empty set isn't proven", () => {
    expect(answerNotes(suggestion(80, 0, { goal: "steps", gap: 0.02 }), target, null)).toEqual([
      "No gear found that helps.",
      "Within 2% of the best possible for Fastest.",
    ]);
  });

  it("names the required gear the character doesn't have", () => {
    const missingNeeds = [
      { label: "Pickaxe (Mining 50)", keywords: ["pickaxe"], count: 1, level: null, itemId: null },
      { label: "Light source", keywords: ["light_source"], count: 1, level: null, itemId: null },
    ];

    expect(answerNotes({ ...suggestion(30), missingNeeds }, target, 50)).toEqual([
      "You don't have the gear this needs: Pickaxe (Mining 50), Light source. The set leaves it out.",
    ]);
  });

  it("says both when the level is too low and no gear helps", () => {
    expect(answerNotes(suggestion(80, 0), target, 20)).toEqual([
      "You need Mining level 40 for this. Here's the set for when you get there.",
      "No gear helps with this.",
    ]);
  });

  it.each([
    [{ goal: "steps", gap: 0.008 }, "Within 0.8% of the best possible for Fastest."],
    [{ goal: "steps", gap: 0.00041 }, "Within 0.1% of the best possible for Fastest."],
  ] as const)("says how close the set is on the first priority (%j)", (margin, note) => {
    expect(answerNotes(suggestion(30, 1, margin), target, null)).toEqual([note]);
  });

  it("adds no note for a proven set when the player picked several priorities", () => {
    expect(answerNotes(suggestion(30, 1, null, ["steps", "chests", "materials"]), target, null)).toEqual([]);
  });
});

describe("stepsTile", () => {
  const result: StepsResult = { efficiency: 1.5, steps: 5548, averageSteps: 4604 };
  const withGoals = (goals: string[]) => ({ result, goals }) as unknown as GearSuggestion;

  it.each([
    [["steps", "chests"], true],
    [["chests"], false],
  ])("highlights the steps tile for goals %j: %s", (goals, highlight) => {
    expect(stepsTile(withGoals(goals)).highlight).toBe(highlight);
  });

  it("shows the set's steps on their own", () => {
    expect(stepsTile(withGoals(["steps"]))).toEqual({
      key: "steps",
      value: "5,548",
      label: "Steps per action",
      details: [],
      highlight: true,
      over: false,
    });
  });
});
