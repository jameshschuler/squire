export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "squire-theme";
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: "#ffffff", dark: "#0a0a0a" };

const THEME_ORDER: Theme[] = ["system", "light", "dark"];

export function parseTheme(value: string | null): Theme {
  return THEME_ORDER.includes(value as Theme) ? (value as Theme) : "system";
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }
  return theme;
}

export function nextTheme(theme: Theme): Theme {
  return THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]!;
}
