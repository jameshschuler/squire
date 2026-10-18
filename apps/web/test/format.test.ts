import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatEffect,
  formatKeyword,
  formatPercent,
  formatRegion,
  formatSkillLevel,
  formatSteps,
  formatTitle,
  lootTypeLabel,
} from "@/lib/format";

describe("formatPercent", () => {
  it.each([
    [1.5, "150%"],
    [1, "100%"],
    [1.125, "113%"],
  ])("formats %s as %s", (ratio, expected) => {
    expect(formatPercent(ratio)).toBe(expected);
  });
});

describe("formatKeyword", () => {
  it.each([
    ["cooked_fish", "cooked fish"],
    ["hunting_product", "hunting product"],
    ["ore", "ore"],
  ])("formats %s as %s", (keyword, expected) => {
    expect(formatKeyword(keyword)).toBe(expected);
  });
});

describe("formatEffect", () => {
  it.each([
    ["+7%", "Work efficiency", "+7% work efficiency"],
    ["-1", "Steps required", "-1 steps required"],
    ["25%", "Chance to find 1 to 10 gold pieces", "25% chance to find 1 to 10 gold pieces"],
  ])("formats %s %s as %s", (normal, stat, expected) => {
    expect(formatEffect({ normal, stat })).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [500, "500 steps"],
    [1000, "1,000 steps"],
    [10000, "10,000 steps"],
  ])("formats %s steps as %s", (steps, expected) => {
    expect(formatDuration(steps)).toBe(expected);
  });
});

describe("formatSteps", () => {
  it.each([
    [110, 1.5, "110 base steps · 74 min steps"],
    [150, 1.7, "150 base steps · 89 min steps"],
    [200, 2, "200 base steps · 100 min steps"],
    [80, 1, "80 base steps"],
    [80, null, "80 base steps"],
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

describe("lootTypeLabel", () => {
  it.each([
    ["main", null],
    ["secondary", "Extra roll"],
    ["gem", "Gem find"],
    ["birdNest", "Bird nest"],
    ["chestTable", "Chest"],
    ["collectible", "Collectible"],
    ["petEgg", "Pet egg"],
  ] as const)("labels %s as %s", (lootType, expected) => {
    expect(lootTypeLabel(lootType)).toBe(expected);
  });
});

describe("formatRegion", () => {
  it.each([
    ["Grand Duchy of Trellin-Erdwise", "GDTE"],
    ["Empire of Wallisia", "Wallisia"],
    ["Jarvonia", "Jarvonia"],
    ["Syrenthia", "Syrenthia"],
  ])("shows %s as %s", (region, expected) => {
    expect(formatRegion(region)).toBe(expected);
  });
});

describe("formatTitle", () => {
  it.each([
    ["frosthook emporium", "Frosthook Emporium"],
    ["kallaheim general store", "Kallaheim General Store"],
    ["temple of the sun", "Temple of the Sun"],
    ["the old mill", "The Old Mill"],
    ["Tutorial cabin", "Tutorial Cabin"],
  ])("formats %j as %j", (text, expected) => {
    expect(formatTitle(text)).toBe(expected);
  });
});
