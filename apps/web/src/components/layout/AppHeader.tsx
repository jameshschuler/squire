import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur">
      <Link to="/" className="inline-flex items-center gap-2 font-semibold">
        <BookOpen className="size-5" />
        Squire
      </Link>
    </header>
  );
}
