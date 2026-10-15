import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeProvider } from "@/contexts/theme-context";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function stubSystemTheme(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", () => query);
  return (nowDark: boolean) => {
    query.matches = nowDark;
    listeners.forEach((fn) => fn());
  };
}

const isDark = () => document.documentElement.classList.contains("dark");
const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
  it("starts on system and follows the OS setting", () => {
    stubSystemTheme(true);
    renderToggle();
    expect(screen.getByTitle("System theme")).toBeDefined();
    expect(isDark()).toBe(true);
  });

  it("follows the OS live while on system", () => {
    const setSystemDark = stubSystemTheme(false);
    renderToggle();
    setSystemDark(true);
    expect(isDark()).toBe(true);
  });

  it("cycles to light, then dark, and saves the choice", () => {
    stubSystemTheme(true);
    renderToggle();
    fireEvent.click(screen.getByRole("button"));
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    fireEvent.click(screen.getByRole("button"));
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("restores a saved choice and ignores the OS", () => {
    const setSystemDark = stubSystemTheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderToggle();
    setSystemDark(true);
    expect(screen.getByTitle("Light theme")).toBeDefined();
    expect(isDark()).toBe(false);
  });
});
