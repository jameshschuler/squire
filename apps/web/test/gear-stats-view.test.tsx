import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GearStats } from "@/components/gear/GearStats";
import type { StatGroups } from "@/lib/gear-stats";

const steps = { key: "steps", value: "138", label: "Steps per action", details: [], highlight: true, over: false };
const efficiencyTile = (over: boolean) => ({
  key: "workEfficiency",
  value: "+59%",
  label: "Work efficiency",
  details: [],
  highlight: false,
  over,
});
const rows = [
  { label: "Box trap", value: "+35%" },
  { label: "Total", value: "135%" },
];

afterEach(cleanup);

describe("GearStats", () => {
  it("explains how work efficiency adds up, item by item", () => {
    const groups: StatGroups = { steps: [steps, efficiencyTile(false)], other: [], efficiency: rows };
    render(<GearStats groups={groups} />);
    const breakdown = screen.getByText("How work efficiency adds up").closest("details")!;
    expect(breakdown.textContent).toContain("Box trap+35%");
    expect(breakdown.textContent).toContain("Total135%");
    expect(breakdown.open).toBe(false);
  });

  it("opens the breakdown when work efficiency is over the max, so the reason is in view", () => {
    render(<GearStats groups={{ steps: [steps, efficiencyTile(true)], other: [], efficiency: rows }} />);
    expect(screen.getByText("How work efficiency adds up").closest("details")!.open).toBe(true);
  });

  it("leaves out the breakdown when no gear changes work efficiency", () => {
    render(<GearStats groups={{ steps: [steps], other: [], efficiency: [] }} />);
    expect(screen.queryByText("How work efficiency adds up")).toBeNull();
  });
});
