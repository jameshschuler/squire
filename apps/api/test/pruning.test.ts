import { describe, expect, it } from "vitest";
import { banMasks, clashes, conflicts, type KeywordRules } from "../src/gear-data/pruning.js";
import type { Candidate } from "../src/gear-data/candidates.js";

const bannedKeywords = { fishing_rod: ["fishing_net", "fishing_rod"], needle: ["needle"] };
const rules: KeywordRules = {
  bannedKeywords,
  banKeys: new Set(["fishing_rod", "fishing_net", "needle"]),
  setGroups: [],
};
const item = (...keywords: string[]) => ({ keywords }) as Candidate;
const masks = banMasks(rules);

describe("banMasks", () => {
  it.each([
    ["two rods", item("fishing_rod"), item("fishing_rod"), true],
    ["a rod and a net it bans", item("fishing_rod"), item("fishing_net"), true],
    ["a net and the rod that bans it", item("fishing_net"), item("fishing_rod"), true],
    ["two nets, which nothing bans together", item("fishing_net"), item("fishing_net"), false],
    ["a rod and a needle", item("fishing_rod"), item("needle"), false],
    ["items without ban keywords", item("ring"), item("ring", "rare"), false],
  ])("finds the same clash as the keyword rules for %s", (_, a, b, clash) => {
    expect(clashes(masks(a).keys, masks(b))).toBe(clash);
    expect(conflicts(rules, a, b)).toBe(clash);
  });

  it("clashes with worn gear once any piece bans the next item, or the next item bans a piece", () => {
    const worn = masks(item("needle")).keys | masks(item("fishing_net")).keys;
    expect(clashes(worn, masks(item("fishing_rod")))).toBe(true);
    expect(clashes(masks(item("fishing_rod")).keys, masks(item("needle", "fishing_net")))).toBe(true);
    expect(clashes(worn, masks(item("ring")))).toBe(false);
  });
});
