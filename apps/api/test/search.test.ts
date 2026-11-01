import { describe, expect, it } from "vitest";
import type { Candidate } from "../src/gear-data/candidates.js";
import { keywordRules } from "../src/gear-data/pruning.js";
import { coverage, type PartialSet } from "../src/gear-data/search.js";
import { NO_STATS } from "../src/gear-data/steps.js";
import type { GearCondition } from "../src/gear-data/types.js";

const wearing = (...pieces: string[]): PartialSet => ({
  chosen: [],
  guaranteed: NO_STATS,
  optimistic: NO_STATS,
  used: 0,
  bans: 0n,
  setItems: [pieces],
});

const setPiece = (quantity: number, opposite: boolean) =>
  ({
    setBonuses: [
      {
        conditions: [
          { type: "distinctKeywordItemsEquipped", opposite, requirement: { quantity, keywords: ["miner_set"] } },
        ] as GearCondition[],
        totals: NO_STATS,
      },
    ],
  }) as Candidate;

describe("coverage", () => {
  it.each([
    ["with enough for a need of 1 covers one with more", 1, wearing("lantern"), wearing("lantern", "torch"), true],
    ["with enough for a need of 1 covers one with as many", 1, wearing("lantern"), wearing("torch"), true],
    ["short of a need of 1 doesn't cover one that meets it", 1, wearing(), wearing("torch"), false],
    ["short of a need of 2 doesn't cover one with more", 2, wearing("lantern"), wearing("torch", "candle"), false],
    [
      "with enough for a need of 2 covers one with more",
      2,
      wearing("lantern", "torch"),
      wearing("candle", "lamp", "glow"),
      true,
    ],
  ])("a partial set %s", (_, count, state, other, expected) => {
    expect(coverage(0, 0, keywordRules({}, [], [count]))(state, other)).toBe(expected);
  });

  it("compares set pieces only up to the most any bonus asks for", () => {
    const covers = coverage(0, 0, keywordRules({}, [setPiece(2, false)], []));

    expect(covers(wearing("helm", "boots"), wearing("helm", "boots", "gloves"))).toBe(true);
    expect(covers(wearing("helm"), wearing("boots", "gloves"))).toBe(false);
  });

  it("needs the exact piece count for a set with a fewer-pieces bonus, since more can hurt", () => {
    const covers = coverage(0, 0, keywordRules({}, [setPiece(3, true)], []));

    expect(covers(wearing("helm"), wearing("helm", "boots"))).toBe(false);
    expect(covers(wearing("helm", "boots"), wearing("helm"))).toBe(false);
  });
});
