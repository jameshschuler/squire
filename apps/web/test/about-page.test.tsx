import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { AboutPage } from "@/components/about/AboutPage";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

describe("AboutPage", () => {
  it("credits WalkScape and says Squire is unofficial", async () => {
    await renderWithRouter(<AboutPage />);
    expect(screen.getByText(/Game data and icons © WalkScape\. Squire is an unofficial fan tool/)).toBeDefined();
  });

  it.each([
    ["WalkScape", "https://walkscape.app"],
    ["Wiki", "https://wiki.walkscape.app/wiki/WalkScape:_Grind_by_walking!"],
    ["Discord", "https://discord.gg/Kk6VecJFEk"],
    ["Source code", "https://github.com/jameshschuler/squire"],
  ])("links to %s in a new tab", async (name, href) => {
    await renderWithRouter(<AboutPage />);
    const link = screen.getByRole("link", { name });
    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("has a way back", async () => {
    await renderWithRouter(<AboutPage />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDefined();
  });
});
