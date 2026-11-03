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
    source("workEfficiency", -0.1, true, "Mountaineering guidebook"),
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
    expect(stepsBreakdown(rescueTeam).map(({ label, detail, note, result }) => [label, detail, note, result])).toEqual([
      ["Base steps", null, null, "8,500"],
      ["Work efficiency", "÷ 150%", "159% from gear and level, capped at 150%", "5,666.7"],
      ["Steps required", "−2%", null, "5,553.3"],
      ["Flat steps", "−6", null, "5,547.3"],
      ["Rounded up", null, null, "5,548"],
    ]);
  });

  it("lists what's behind each step, biggest help first, adding up copies of one item", () => {
    const [, efficiency, percent, flat] = stepsBreakdown(rescueTeam);

    expect(efficiency?.sources).toEqual([
      { name: "Level bonus", value: "+25%" },
      { name: "Oak skis", value: "+24%" },
      { name: "Cape of Half-Achiever", value: "+20%" },
      { name: "Mountaineering guidebook", value: "−10%" },
    ]);
    expect(percent?.sources).toEqual([{ name: "Stepring", value: "−2%" }]);
    expect(flat?.sources).toEqual([
      { name: "Wanderlust walking stick", value: "−4" },
      { name: "Cape of Half-Achiever", value: "−2" },
    ]);
  });

  it("skips step changes the set doesn't have, and the level bonus below the requirement", () => {
    const bare = {
      ...rescueTeam,
      levelBonus: 0,
      result: { efficiency: 1, steps: 8500, averageSteps: 8500 },
      sources: [],
    };

    expect(stepsBreakdown(bare)).toEqual([
      { label: "Base steps", detail: null, note: null, result: "8,500", sources: [] },
      { label: "Work efficiency", detail: "÷ 100%", note: null, result: "8,500", sources: [] },
      { label: "Rounded up", detail: null, note: null, result: "8,500", sources: [] },
    ]);
  });

  it("explains no cap when the activity has no max efficiency", () => {
    const uncapped = { ...rescueTeam, cap: Number.POSITIVE_INFINITY };

    expect(stepsBreakdown(uncapped)[1]?.note).toBeNull();
  });
});
