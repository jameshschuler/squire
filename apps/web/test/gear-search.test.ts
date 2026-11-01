import { describe, expect, it } from "vitest";
import { parseGoals, validateGearSearch } from "@/lib/gear-search";

describe("validateGearSearch", () => {
  it("keeps the answers it understands", () => {
    expect(validateGearSearch({ target: "activity:mine", location: "best", goals: "steps" })).toEqual({
      target: "activity:mine",
      location: "best",
      goals: "steps",
    });
  });

  it("drops answers of the wrong shape", () => {
    expect(validateGearSearch({ target: 4, location: ["x"], goals: 2 })).toEqual({
      target: undefined,
      location: undefined,
      goals: undefined,
    });
  });
});

describe("parseGoals", () => {
  const allowed = ["steps", "items", "xp", "chests"] as const;

  it("keeps known goals in order, once each, up to three", () => {
    expect(parseGoals("chests,steps,chests,xp,items", [...allowed])).toEqual(["chests", "steps", "xp"]);
  });

  it("drops goals the activity can't give and unknown ones", () => {
    expect(parseGoals("gems,steps,nonsense", [...allowed])).toEqual(["steps"]);
  });

  it("has no goals when none are given", () => {
    expect(parseGoals(undefined, [...allowed])).toEqual([]);
  });
});
