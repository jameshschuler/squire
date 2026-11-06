import { describe, expect, it } from "vitest";
import type { GearSuggestion } from "@walkscape-community/gear-optimizer";
import { gearSearchAsked, gearSearchLog, type GearSearchAsked } from "@/lib/gear-search-log";
import { recommendedGoals, type GearTarget } from "@/lib/gear-targets";

const place = (id: string) => ({ id, name: id, region: "Jarvonia" });
const hideout = {
  id: "venture_into_the_hideout",
  kind: "activity",
  locations: [place("hideout"), place("bog")],
  lootTypes: ["main"],
  makesTieredGear: false,
} as unknown as GearTarget;
const details = {
  target: hideout,
  location: undefined,
  goals: ["steps" as const],
  withCharacter: true,
  bookVersion: "v1",
};

describe("gearSearchAsked", () => {
  it("logs what was asked", () => {
    expect(gearSearchAsked(details)).toEqual({
      target: "venture_into_the_hideout",
      kind: "activity",
      location: null,
      goals: ["steps"],
      recommended: false,
      withCharacter: true,
      bookVersion: "v1",
    });
  });

  it.each([
    ["the picked location", { ...details, location: "bog" }, "bog"],
    ["the best-location choice", { ...details, location: "best" }, "best"],
    [
      "the only location when there's nothing to pick",
      { ...details, target: { ...hideout, locations: [place("hideout")] } },
      "hideout",
    ],
    ["no location when there are none", { ...details, target: { ...hideout, locations: [] } }, null],
  ])("keeps %s", (_, input, expected) => {
    expect(gearSearchAsked(input).location).toBe(expected);
  });

  it("says when the priorities are the recommended ones, in order", () => {
    const recommended = recommendedGoals(hideout);

    expect(gearSearchAsked({ ...details, goals: recommended }).recommended).toBe(true);
    expect(gearSearchAsked({ ...details, goals: [...recommended].reverse() }).recommended).toBe(false);
  });
});

describe("gearSearchLog", () => {
  const asked = gearSearchAsked(details) satisfies GearSearchAsked;
  const solution = (margin: GearSuggestion["margin"]) => ({ searchMs: 50_212.6, margin }) as GearSuggestion;

  it("adds how long an unproven search took", () => {
    expect(gearSearchLog(asked, solution({ goal: "steps", gap: 0.4 }))).toEqual({
      ...asked,
      failed: false,
      searchMs: 50_213,
      proven: false,
      margin: { goal: "steps", gap: 0.4 },
    });
  });

  it("marks a search with no margin as proven", () => {
    expect(gearSearchLog(asked, solution(null))).toMatchObject({ proven: true, margin: null });
  });

  it("marks a search that crashed as failed, with no result", () => {
    expect(gearSearchLog(asked, null)).toMatchObject({ failed: true, searchMs: null, proven: null, margin: null });
  });
});
