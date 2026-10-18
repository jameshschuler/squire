import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Effect } from "@squire/api/recipe-book";
import { ItemEffectsSection } from "@/components/items/ItemEffectsSection";

afterEach(cleanup);

const rows = () => screen.getAllByRole("row").map((row) => [...row.children].map((cell) => cell.textContent));

describe("ItemEffectsSection", () => {
  it("puts the duration in the heading and lists each condition once, with normal and fine values", () => {
    render(
      <ItemEffectsSection
        effects={{
          steps: 500,
          tiers: [],
          effects: [
            {
              condition: "While doing Woodcutting",
              scope: null,
              stat: "Steps required",
              normal: "-1",
              fine: "-2",
              appliesTo: [],
            },
            {
              condition: "While doing Woodcutting",
              scope: null,
              stat: "Double rewards",
              normal: "+2%",
              fine: "+4%",
              appliesTo: [],
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading").textContent).toBe("Effects · 500 steps");
    expect(rows()).toEqual([
      ["While doing Woodcutting", "Normal", "Fine"],
      ["Steps required", "-1", "-2"],
      ["Double rewards", "+2%", "+4%"],
    ]);
  });

  it("gives each condition its own group", () => {
    render(
      <ItemEffectsSection
        effects={{
          steps: 750,
          tiers: [],
          effects: [
            {
              condition: "While doing Foraging",
              scope: null,
              stat: "Chance to find gold",
              normal: "25%",
              fine: "50%",
              appliesTo: [],
            },
            {
              condition: "While doing Hunting",
              scope: null,
              stat: "Chance to find gold",
              normal: "25%",
              fine: "50%",
              appliesTo: [],
            },
          ],
        }}
      />,
    );
    expect(rows().map((row) => row[0])).toEqual([
      "While doing Foraging",
      "Chance to find gold",
      "While doing Hunting",
      "Chance to find gold",
    ]);
  });

  it("titles the section plainly when the duration isn't in steps", () => {
    render(
      <ItemEffectsSection
        effects={{
          steps: null,
          tiers: [],
          effects: [
            { condition: "Global", scope: null, stat: "Inventory space", normal: "+5", fine: "+10", appliesTo: [] },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading").textContent).toBe("Effects");
  });

  it("shows one value column for gear, which has no fine version", () => {
    render(
      <ItemEffectsSection
        effects={{
          steps: null,
          tiers: [],
          effects: [
            {
              condition: "While doing Crafting",
              scope: null,
              stat: "Work efficiency",
              normal: "+7%",
              fine: null,
              appliesTo: [],
            },
          ],
        }}
      />,
    );
    expect(rows()).toEqual([["While doing Crafting"], ["Work efficiency", "+7%"]]);
  });

  describe("crafted gear tiers", () => {
    const effect = (stat: string, normal: string): Effect => ({
      condition: "While doing Woodcutting",
      scope: "Woodcutting",
      stat,
      normal,
      fine: null,
      appliesTo: [],
    });
    const hatchet = {
      steps: null,
      effects: [effect("Work efficiency", "+9%")],
      tiers: [
        { quality: "uncommon" as const, effects: [effect("Work efficiency", "+11%"), effect("Chest finding", "+13%")] },
        { quality: "ethereal" as const, effects: [effect("Work efficiency", "+27%"), effect("Chest finding", "+26%")] },
      ],
    };
    const tier = (name: string) => screen.getByRole("button", { name });

    it("names the tiers like the game and starts on Normal", () => {
      render(<ItemEffectsSection effects={hatchet} />);
      expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Normal", "Good", "Eternal"]);
      expect(tier("Normal").getAttribute("aria-pressed")).toBe("true");
      expect(rows().slice(1)).toEqual([["Work efficiency", "+9%"]]);
    });

    it("shows a tier's total effects when picked", () => {
      render(<ItemEffectsSection effects={hatchet} />);
      fireEvent.click(tier("Eternal"));
      expect(tier("Eternal").getAttribute("aria-pressed")).toBe("true");
      expect(rows().slice(1)).toEqual([
        ["Work efficiency", "+27%"],
        ["Chest finding", "+26%"],
      ]);
    });

    it("has no tier picker for gear without tiers", () => {
      render(<ItemEffectsSection effects={{ ...hatchet, tiers: [] }} />);
      expect(screen.queryByRole("button")).toBeNull();
    });
  });
});
