import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppFooter } from "@/components/layout/AppFooter";

afterEach(cleanup);

describe("AppFooter", () => {
  it("credits WalkScape", () => {
    render(<AppFooter />);
    expect(screen.getByText(/Game data and icons © WalkScape/)).toBeDefined();
  });

  it.each([
    ["WalkScape", "https://walkscape.app"],
    ["Wiki", "https://wiki.walkscape.app/wiki/WalkScape:_Grind_by_walking!"],
    ["Discord", "https://discord.gg/Kk6VecJFEk"],
  ])("links to %s in a new tab", (name, href) => {
    render(<AppFooter />);
    const link = screen.getByRole("link", { name });
    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
