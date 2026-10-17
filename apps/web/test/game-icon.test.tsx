import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { GameIcon } from "@/components/shared/GameIcon";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const icon = (container: HTMLElement) => container.querySelector("img")!;

describe("GameIcon", () => {
  it("shows a placeholder until the icon loads", () => {
    const { container } = render(<GameIcon path="assets/icons/bagel.png" />);
    expect(icon(container).dataset.state).toBe("loading");
    fireEvent.load(icon(container));
    expect(icon(container).dataset.state).toBe("loaded");
  });

  it("keeps a still placeholder when the icon fails to load", () => {
    const { container } = render(<GameIcon path="assets/icons/missing.png" />);
    fireEvent.error(icon(container));
    expect(icon(container).dataset.state).toBe("failed");
  });

  it("shows an icon the browser already has right away, without a placeholder", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(32);
    const { container } = render(<GameIcon path="assets/icons/bagel.png" />);
    expect(icon(container).dataset.state).toBe("loaded");
  });

  it("goes back to the placeholder when it's given a different icon", () => {
    const { container, rerender } = render(<GameIcon path="assets/icons/bagel.png" />);
    fireEvent.load(icon(container));
    rerender(<GameIcon path="assets/icons/pie.png" />);
    expect(icon(container).dataset.state).toBe("loading");
  });

  it("shows a still square when there's no icon at all", () => {
    const { container } = render(<GameIcon path="" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("span")).not.toBeNull();
  });
});
