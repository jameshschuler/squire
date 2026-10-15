import { describe, expect, it } from "vitest";
import { formatPercent, formatSkillLevel } from "@/lib/format";

describe("formatPercent", () => {
  it.each([
    [1.9, "190%"],
    [1, "100%"],
    [0.125, "13%"],
  ])("formats %s as %s", (ratio, expected) => {
    expect(formatPercent(ratio)).toBe(expected);
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
