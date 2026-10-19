import { describe, expect, it } from "vitest";
import { PULL_THRESHOLD, pullDistance } from "@/lib/pull-to-refresh";

describe("pullDistance", () => {
  it.each([
    [-40, 0],
    [0, 0],
    [60, 30],
    [PULL_THRESHOLD * 2, PULL_THRESHOLD],
    [1000, 110],
  ])("turns a %ipx drag into %ipx of pull", (dragged, expected) => {
    expect(pullDistance(dragged)).toBe(expected);
  });
});
