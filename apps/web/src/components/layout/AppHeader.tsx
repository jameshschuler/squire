import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
      <Link to="/" className="text-lg font-semibold">
        Squire
      </Link>
      <ThemeToggle />
    </header>
  );
}
