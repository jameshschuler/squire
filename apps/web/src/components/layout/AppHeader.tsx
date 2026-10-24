import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
      <Link to="/" className="text-lg font-semibold">
        Squire
      </Link>
      <div className="flex items-center">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/about" aria-label="About Squire" title="About">
            <Info className="size-5" />
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
