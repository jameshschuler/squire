import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/contexts/theme-context";
import { nextTheme, type Theme } from "@/lib/theme";

const THEME_UI: Record<Theme, { label: string; Icon: typeof Sun }> = {
  system: { label: "System theme", Icon: Monitor },
  light: { label: "Light theme", Icon: Sun },
  dark: { label: "Dark theme", Icon: Moon },
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();
  const { label, Icon } = THEME_UI[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${label}. Switch to ${THEME_UI[nextTheme(theme)].label.toLowerCase()}`}
      title={label}
      onClick={() => setTheme(nextTheme(theme))}
    >
      <Icon className="size-5" />
    </Button>
  );
}
