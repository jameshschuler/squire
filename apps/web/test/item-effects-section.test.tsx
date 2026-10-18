import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ItemEffectsSection } from "@/components/items/ItemEffectsSection";

afterEach(cleanup);

const rows = () => screen.getAllByRole("row").map((row) => [...row.children].map((cell) => cell.textContent));

describe("ItemEffectsSection", () => {
  it("puts the duration in the heading and lists each condition once, with normal and fine values", () => {
    render(
      <ItemEffectsSection
        effects={{
          steps: 500,
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
});
