import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
      <Link to="/" className="inline-flex items-center gap-2 font-semibold">
        <BookOpen className="size-5" />
        Squire
      </Link>
      <ThemeToggle />
    </header>
  );
}
