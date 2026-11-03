import { describe, expect, it } from "vitest";
import type { SourcedStat } from "@walkscape-community/gear-optimizer";
import { stepsBreakdown, type BreakdownInput } from "@/lib/steps-breakdown";

const source = (stat: SourcedStat["stat"], value: number, isPercent: boolean, name: string): SourcedStat => ({
  stat,
  value,
  isPercent,
  source: name,
});

const rescueTeam: BreakdownInput = {
  workRequired: 8500,
  levelBonus: 0.25,
  cap: 0.5,
  result: { efficiency: 1.5, steps: 5548, averageSteps: 4604.1 },
  sources: [
    source("workEfficiency", 0.24, true, "Oak skis"),
    source("workEfficiency", 0.2, true, "Cape of Half-Achiever"),
    source("stepsRequired", -0.01, true, "Stepring"),
    source("stepsRequired", -0.01, true, "Stepring"),
    source("stepsRequired", -4, false, "Wanderlust walking stick"),
    source("stepsRequired", -2, false, "Cape of Half-Achiever"),
    source("doubleAction", 0.205, true, "Flowy trousers"),
    source("chestFind", 0.1, true, "Oak skis"),
  ],
};

describe("stepsBreakdown", () => {
  it("works from base steps through each step change to the rounded steps, leaving out double action", () => {
    expect(stepsBreakdown(rescueTeam).map(({ label, detail, result }) => [label, detail, result])).toEqual([
      ["Base steps", null, "8,500"],
      ["Work efficiency", "169%, max 150%", "÷ 150% = 5,666.7"],
      ["Steps required", "−2%", "5,553.3"],
      ["Steps required (flat)", "−6", "5,547.3"],
      ["Rounded up", null, "5,548"],
    ]);
  });

  it("names the level bonus and each item behind a step, adding up copies of one item", () => {
    const [, efficiency, percent, flat] = stepsBreakdown(rescueTeam);

    expect(efficiency?.sources).toEqual(["Level bonus +25%", "Oak skis +24%", "Cape of Half-Achiever +20%"]);
    expect(percent?.sources).toEqual(["Stepring −2%"]);
    expect(flat?.sources).toEqual(["Wanderlust walking stick −4", "Cape of Half-Achiever −2"]);
  });

  it("skips step changes the set doesn't have, and the level bonus below the requirement", () => {
    const bare = {
      ...rescueTeam,
      levelBonus: 0,
      result: { efficiency: 1, steps: 8500, averageSteps: 8500 },
      sources: [],
    };

    expect(stepsBreakdown(bare)).toEqual([
      { label: "Base steps", detail: null, result: "8,500", sources: [] },
      { label: "Work efficiency", detail: "100%", result: "÷ 100% = 8,500", sources: [] },
      { label: "Rounded up", detail: null, result: "8,500", sources: [] },
    ]);
  });

  it("shows efficiency without a max when the activity has none", () => {
    const uncapped = { ...rescueTeam, cap: Number.POSITIVE_INFINITY };

    expect(stepsBreakdown(uncapped)[1]?.detail).toBe("169%");
  });
});
