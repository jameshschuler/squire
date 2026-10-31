import { describe, expect, it } from "vitest";
import type { GearSuggestion, GoalId, Margin, StepsResult } from "@squire/api/gear-data";
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
  }) as unknown as GearSuggestion;

describe("answerNotes", () => {
  it("says the set is proven best when gear helps and the level is fine", () => {
    expect(answerNotes(suggestion(30), target, 50)).toEqual(["Proven best set for this gear."]);
  });

  it("says when the character's level is too low", () => {
    expect(answerNotes(suggestion(30), target, 20)).toEqual([
      "You need Mining level 40 for this. Here's the set for when you get there.",
      "Proven best set for this gear.",
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

  it.each([
    [{ goal: "steps", gap: 0.008 }, "Within 0.8% of the best possible for Fastest."],
    [{ goal: "steps", gap: 0.00041 }, "Within 0.1% of the best possible for Fastest."],
  ] as const)("says how close the set is on the first priority (%j)", (margin, note) => {
    expect(answerNotes(suggestion(30, 1, margin), target, null)).toEqual([note]);
  });

  it("claims proof only for the first priority when the player picked several", () => {
    const notes = answerNotes(suggestion(30, 1, null, ["steps", "chests", "materials"]), target, null);
    expect(notes).toEqual(["Proven best for Fastest."]);
  });
});

describe("stepsTile", () => {
  const result: StepsResult = { efficiency: 1.5, steps: 40, averageSteps: 32 };
  const noGear: StepsResult = { efficiency: 1, steps: 63, averageSteps: 63 };
  const withGoals = (goals: string[]) => ({ result, goals }) as unknown as GearSuggestion;

  it.each([
    [["steps", "chests"], true],
    [["chests"], false],
  ])("highlights the steps tile for goals %j: %s", (goals, highlight) => {
    expect(stepsTile(withGoals(goals), noGear, 28).highlight).toBe(highlight);
  });

  it("shows the set's steps with the fewest possible and the no-gear steps", () => {
    expect(stepsTile(withGoals(["steps"]), noGear, 28)).toEqual({
      key: "steps",
      value: "40",
      label: "Steps per action",
      details: ["Min 28 · Max 63"],
      highlight: true,
      over: false,
    });
  });

  it("never shows a minimum above the set's own steps", () => {
    expect(stepsTile(withGoals(["steps"]), noGear, 42).details).toEqual(["Min 40 · Max 63"]);
  });

  it("formats large step counts", () => {
    const long = { result: { efficiency: 1, steps: 5547, averageSteps: 5547 }, goals: [] } as unknown as GearSuggestion;
    const bare = { efficiency: 1, steps: 12400, averageSteps: 12400 };
    expect(stepsTile(long, bare, 4100)).toMatchObject({ value: "5,547", details: ["Min 4,100 · Max 12,400"] });
  });
});
