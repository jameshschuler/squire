import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="bg-background/95 sticky top-0 z-10 flex items-center justify-between border-b px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
      <Link to="/" className="inline-flex items-center gap-2 font-semibold">
        <BookOpen className="size-5" />
        Squire
      </Link>
      <ThemeToggle />
    </header>
  );
}
