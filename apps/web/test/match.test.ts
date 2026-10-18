import { describe, expect, it } from "vitest";
import { matchesWords } from "@/lib/match";

describe("matchesWords", () => {
  it.each([
    [["sal", "pie"], ["Salmon pie"], true],
    [["wood"], ["Salmon pie", "woodcutting"], true],
    [["cake"], ["Salmon pie"], false],
    [[], ["Salmon pie"], true],
  ])("terms %j in %j: %s", (terms, texts, expected) => {
    expect(matchesWords(terms, texts)).toBe(expected);
  });
});
