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
  it("shows the app name as a link home", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    await renderWithRouter(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>,
    );
    const home = screen.getByRole("link", { name: "Squire" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.textContent).toBe("Squire");
  });
});
