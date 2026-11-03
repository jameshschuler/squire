import { describe, expect, it } from "vitest";
import { levelPercent, nextLevelLabel } from "@/lib/levels";

describe("levelPercent", () => {
  it.each([
    [{ level: 2, gained: 0, needed: 91 }, 0],
    [{ level: 50, gained: 2_653, needed: 10_612 }, 25],
    [{ level: 99, gained: 6_965_569, needed: null }, 100],
  ])("%o is %i% of the way", (progress, percent) => {
    expect(levelPercent(progress)).toBe(percent);
  });
});

describe("nextLevelLabel", () => {
  it("says how far into the level and what the next one takes", () => {
    expect(nextLevelLabel({ level: 80, gained: 64_087, needed: 951_050 }, "steps")).toBe(
      "64,087 / 951,050 steps to level 81",
    );
  });

  it("says max level when there's no next level", () => {
    expect(nextLevelLabel({ level: 99, gained: 0, needed: null }, "XP")).toBe("Max level");
  });
});
