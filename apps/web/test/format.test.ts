import { describe, expect, it } from "vitest";
import { formatSkillLevel, formatSteps } from "@/lib/format";

describe("formatSteps", () => {
  it.each([
    [110, 1.5, "110 steps · 74 at best"],
    [150, 1.7, "150 steps · 89 at best"],
    [200, 2, "200 steps · 100 at best"],
    [80, 1, "80 steps"],
  ])("formats %s work with a %s cap as %s", (work, cap, expected) => {
    expect(formatSteps(work, cap)).toBe(expected);
  });
});

describe("formatSkillLevel", () => {
  it("adds Lvl and the level when there is one", () => {
    expect(formatSkillLevel({ name: "Cooking", level: 38 })).toBe("Cooking Lvl 38");
  });

  it("shows just the name without a level", () => {
    expect(formatSkillLevel({ name: "Cooking", level: null })).toBe("Cooking");
  });
});
