import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { THEME_COLORS, THEME_STORAGE_KEY, parseTheme, resolveTheme, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(() => parseTheme(localStorage.getItem(THEME_STORAGE_KEY)));

  useEffect(() => {
    const query = darkQuery();
    const apply = () => {
      const resolved = resolveTheme(theme, query.matches);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return value;
}
