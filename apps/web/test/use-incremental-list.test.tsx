import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useIncrementalList } from "@/hooks/useIncrementalList";

let observers: { callback: IntersectionObserverCallback; disconnected: boolean }[] = [];

class FakeIntersectionObserver {
  private readonly entry: { callback: IntersectionObserverCallback; disconnected: boolean };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false };
    observers.push(this.entry);
  }
  observe() {}
  disconnect() {
    this.entry.disconnected = true;
  }
}

function scrollToBottom() {
  const observer = observers.findLast((o) => !o.disconnected);
  act(() => observer?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
}

const items = Array.from({ length: 25 }, (_, i) => `item ${i}`);

function List({ listKey }: { listKey: string }) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(items, listKey, 10);
  return (
    <>
      <p>{visibleItems.length} shown</p>
      {hasMore && <div ref={sentinelRef} data-testid="sentinel" />}
    </>
  );
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useIncrementalList", () => {
  it("shows one page, then the next page each time the end comes into view", () => {
    render(<List listKey="a" />);
    expect(screen.getByText("10 shown")).toBeDefined();
    scrollToBottom();
    expect(screen.getByText("20 shown")).toBeDefined();
    scrollToBottom();
    expect(screen.getByText("25 shown")).toBeDefined();
  });

  it("stops watching once everything is shown", () => {
    render(<List listKey="b" />);
    scrollToBottom();
    scrollToBottom();
    expect(screen.queryByTestId("sentinel")).toBeNull();
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });

  it("remembers how far a list was scrolled when it's shown again", () => {
    const { unmount } = render(<List listKey="c" />);
    scrollToBottom();
    unmount();
    render(<List listKey="c" />);
    expect(screen.getByText("20 shown")).toBeDefined();
  });

  it("starts a different list from the first page", () => {
    const { unmount } = render(<List listKey="d" />);
    scrollToBottom();
    unmount();
    render(<List listKey="e" />);
    expect(screen.getByText("10 shown")).toBeDefined();
  });
});
