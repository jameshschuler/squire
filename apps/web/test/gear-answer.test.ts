import { describe, expect, it } from "vitest";
import { BEST_IN_GAME, buildGearData, type GearSuggestion, type Margin, type StepsResult } from "@squire/api/gear-data";
import type { GameData } from "@squire/api/recipe-book";
import sample from "../../../fixtures/api/gamedata-sample.json";
import gearItems from "../../../fixtures/api/gear.json";
import { answerNotes, gearAnswer, stepsTile } from "@/lib/gear-answer";
import { solveGear } from "@/lib/gear-solution";
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
const suggestion = (averageSteps: number, picks = 1, margin: Margin | null = null): GearSuggestion =>
  ({
    location: null,
    picks: Array(picks).fill({}),
    pet: null,
    totals: {},
    result: steps(averageSteps),
    goals: ["steps", "chests"],
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
    [{ goal: "chests", gap: 0.021 }, "Proven best for Fastest. Within 2.1% of the best possible for Most chests."],
    [{ goal: "steps", gap: 0.00041 }, "Within 0.1% of the best possible for Fastest."],
  ] as const)("says how close an unproven set is to the best possible (%j)", (margin, note) => {
    expect(answerNotes(suggestion(30, 1, margin), target, null)).toEqual([note]);
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

describe("gearAnswer", () => {
  it("lists every item that changes work efficiency in the breakdown, with the gear total", () => {
    const gear = buildGearData({ ...sample, items: [...sample.items, ...gearItems] } as unknown as GameData);
    const optimize = { skill: "woodcutting", level: 1, workRequired: 100, maxWorkEfficiency: 2, locationIds: [] };
    const woodcutting: GearTarget = { ...target, skill: { id: "woodcutting", name: "Woodcutting", level: 1 } };
    const request = { gear, profile: BEST_IN_GAME, target: optimize, goals: ["steps" as const], tieBreakers: [] };
    const view = gearAnswer(gear, BEST_IN_GAME, woodcutting, optimize, solveGear(request));
    const labels = view.stats.efficiency.map((row) => row.label);
    expect(labels.some((label) => /hatchet/i.test(label))).toBe(true);
    expect(labels).toContain("Gear total");
  });
});
