import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/contexts/theme-context";
import { renderWithRouter } from "./render-with-router";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppHeader", () => {
  it("links home with the shield logo, which screen readers skip", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    await renderWithRouter(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>,
    );
    const home = screen.getByRole("link", { name: "Squire" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
