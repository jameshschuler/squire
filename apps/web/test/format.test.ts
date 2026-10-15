import { describe, expect, it } from "vitest";
import { formatPercent, formatSkillLevel, formatSteps } from "@/lib/format";

describe("formatPercent", () => {
  it.each([
    [1.5, "150%"],
    [1, "100%"],
    [1.125, "113%"],
  ])("formats %s as %s", (ratio, expected) => {
    expect(formatPercent(ratio)).toBe(expected);
  });
});

describe("formatSteps", () => {
  it.each([
    [110, 1.5, "110 base steps · 74 min steps"],
    [150, 1.7, "150 base steps · 89 min steps"],
    [200, 2, "200 base steps · 100 min steps"],
    [80, 1, "80 base steps"],
  ])("formats %s work with a %s cap as %s", (work, cap, expected) => {
    expect(formatSteps(work, cap)).toBe(expected);
  });
});

describe("formatSkillLevel", () => {
  it("adds lvl. and the level when there is one", () => {
    expect(formatSkillLevel({ name: "Cooking", level: 38 })).toBe("Cooking lvl. 38");
  });

  it("shows just the name without a level", () => {
    expect(formatSkillLevel({ name: "Cooking", level: null })).toBe("Cooking");
  });
});
