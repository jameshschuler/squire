import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA } from "@squire/api/recipe-book";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { GameDataProvider, useGameDataContext } from "@/contexts/game-data-context";

const book = (version: string) =>
  new Response(JSON.stringify({ schema: RECIPE_BOOK_SCHEMA, version, recipes: [], foods: [], loot: [], gear: [] }));

const failFresh = async (input: RequestInfo | URL) =>
  String(input).includes("fresh=1") ? new Response(null, { status: 502 }) : book("v1");

function Version() {
  const state = useGameDataContext();
  return <p>{state.status === "ready" ? state.book.version : state.status}</p>;
}

function renderApp(fetch: typeof globalThis.fetch) {
  vi.stubGlobal("fetch", vi.fn(fetch));
  render(
    <GameDataProvider>
      <Version />
      <PullToRefresh />
    </GameDataProvider>,
  );
}

async function renderWith(fetch: typeof globalThis.fetch) {
  renderApp(fetch);
  await screen.findByText("v1");
}

function pullTo(pixels: number, { sideways = 0, target = window as Window | Element } = {}) {
  fireEvent.touchStart(target, { touches: [{ clientX: 0, clientY: 0 }] });
  fireEvent.touchMove(target, { touches: [{ clientX: sideways, clientY: pixels }] });
}

function drag(pixels: number, options?: Parameters<typeof pullTo>[1]) {
  pullTo(pixels, options);
  fireEvent.touchEnd(options?.target ?? window);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PullToRefresh", () => {
  it("fetches fresh game data after a long enough pull", async () => {
    await renderWith(async (input) => book(String(input).includes("fresh=1") ? "v2" : "v1"));
    drag(200);
    await expect(screen.findByText("v2")).resolves.toBeDefined();
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toContain("fresh=1");
  });

  it("does nothing after a short pull", async () => {
    await renderWith(async () => book("v1"));
    drag(60);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a pull when the page isn't scrolled to the top", async () => {
    await renderWith(async () => book("v1"));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(300);
    drag(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a sideways swipe", async () => {
    await renderWith(async () => book("v1"));
    drag(200, { sideways: 300 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a drag inside a dialog", async () => {
    await renderWith(async () => book("v1"));
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "alertdialog");
    drag(200, { target: dialog });
    dialog.remove();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows the pull while dragging", async () => {
    await renderWith(async () => book("v1"));
    pullTo(200);
    expect(screen.getByRole("status", { name: "Release to refresh" })).toBeDefined();
  });

  it("clears the indicator when the touch is cancelled", async () => {
    await renderWith(async () => book("v1"));
    pullTo(200);
    fireEvent.touchCancel(window);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.touchEnd(window);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the current data and says so when the refresh fails", async () => {
    await renderWith(failFresh);
    drag(200);
    await expect(screen.findByText("Couldn't refresh")).resolves.toBeDefined();
    expect(screen.getByText("v1")).toBeDefined();
  });

  it("hides the failure message after a moment", async () => {
    await renderWith(failFresh);
    vi.useFakeTimers();
    drag(200);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.queryByText("Couldn't refresh")).toBeNull();
  });

  it("shows the pull over the failure message", async () => {
    await renderWith(failFresh);
    drag(200);
    await screen.findByText("Couldn't refresh");
    pullTo(200);
    expect(screen.getByRole("status", { name: "Release to refresh" })).toBeDefined();
  });

  it("keeps spinning when pulled again right after a failure", async () => {
    let calls = 0;
    await renderWith(async (input) => {
      if (!String(input).includes("fresh=1")) {
        return book("v1");
      }
      calls += 1;
      return calls === 1 ? new Response(null, { status: 502 }) : new Promise<Response>(() => {});
    });
    vi.useFakeTimers();
    drag(200);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("Couldn't refresh")).toBeDefined();
    drag(200);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getByRole("status", { name: "Refreshing game data" })).toBeDefined();
  });

  it("keeps a refresh that finishes before the first load", async () => {
    let finishFirst: (response: Response) => void = () => {};
    renderApp(async (input) =>
      String(input).includes("fresh=1") ? book("v2") : new Promise<Response>((resolve) => (finishFirst = resolve)),
    );
    drag(200);
    await screen.findByText("v2");
    await act(async () => finishFirst(book("v1")));
    expect(screen.getByText("v2")).toBeDefined();
  });
});
