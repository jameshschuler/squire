import { Link } from "@tanstack/react-router";
import { SquireLogo } from "@/components/shared/SquireLogo";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
      <Link to="/" className="inline-flex items-center gap-2 font-semibold">
        <SquireLogo className="h-6 w-auto" />
        Squire
      </Link>
      <ThemeToggle />
    </header>
  );
}
