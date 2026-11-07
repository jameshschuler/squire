import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import type { GearSuggestion } from "@walkscape-community/gear-optimizer";
import type { GearSuggestionState } from "@/hooks/useGearSuggestion";
import type { GearSearchDetails } from "@/lib/gear-search-log";
import type { GearTarget } from "@/lib/gear-targets";

vi.mock("@/lib/api", () => ({ sendGearSearchLog: vi.fn() }));

let useGearSearchLog: typeof import("@/hooks/useGearSearchLog").useGearSearchLog;
let sendGearSearchLog: typeof import("@/lib/api").sendGearSearchLog;

beforeEach(async () => {
  vi.resetModules();
  ({ useGearSearchLog } = await import("@/hooks/useGearSearchLog"));
  ({ sendGearSearchLog } = await import("@/lib/api"));
});

afterEach(cleanup);

const details: GearSearchDetails = {
  target: { id: "mine_gold_ore", kind: "activity", locations: [], lootTypes: ["main"] } as unknown as GearTarget,
  location: undefined,
  goals: ["steps"],
  withCharacter: false,
  bookVersion: "v1",
};
const pending: GearSuggestionState = { solution: null, failed: false };
const finished = (searchMs: number): GearSuggestionState => ({
  solution: { searchMs, margin: null } as GearSuggestion,
  failed: false,
});
const sentLines = () => vi.mocked(sendGearSearchLog).mock.calls.map(([body]) => JSON.parse(body) as object);

function renderLog(state: GearSuggestionState, wrapper?: ({ children }: { children: ReactNode }) => ReactNode) {
  return renderHook(({ state }) => useGearSearchLog(details, state), { initialProps: { state }, wrapper });
}

describe("useGearSearchLog", () => {
  it("sends nothing while the search runs", () => {
    renderLog(pending);
    expect(sendGearSearchLog).not.toHaveBeenCalled();
  });

  it("sends once when a search finishes, even when the page renders again", () => {
    const { rerender } = renderLog(pending);
    const done = finished(120);

    rerender({ state: done });
    rerender({ state: done });
    expect(sentLines()).toEqual([expect.objectContaining({ searchMs: 120, proven: true })]);
  });

  it("sends a search that crashed", () => {
    renderLog({ solution: null, failed: true });
    expect(sentLines()).toEqual([expect.objectContaining({ failed: true })]);
  });

  it("sends each new search", () => {
    const { rerender } = renderHook(({ goals }) => useGearSearchLog({ ...details, goals }, finished(120)), {
      initialProps: { goals: details.goals },
    });

    rerender({ goals: ["xp"] });
    expect(sentLines().map((line) => (line as { goals: string[] }).goals)).toEqual([["steps"], ["xp"]]);
  });

  it("doesn't send the same search again when the page remounts and searches again", () => {
    renderLog(finished(120)).unmount();
    renderLog(pending).rerender({ state: finished(95) });
    expect(sendGearSearchLog).toHaveBeenCalledTimes(1);
  });

  it("sends a search again after a different one", () => {
    const { rerender } = renderHook(({ goals }) => useGearSearchLog({ ...details, goals }, finished(120)), {
      initialProps: { goals: details.goals },
    });

    rerender({ goals: ["xp"] });
    rerender({ goals: ["steps"] });
    expect(sendGearSearchLog).toHaveBeenCalledTimes(3);
  });

  it("sends nothing without a target", () => {
    renderHook(() => useGearSearchLog({ ...details, target: undefined }, finished(120)));
    expect(sendGearSearchLog).not.toHaveBeenCalled();
  });

  it("sends once under StrictMode's double effects", () => {
    renderLog(finished(120), StrictMode);
    expect(sendGearSearchLog).toHaveBeenCalledTimes(1);
  });
});
