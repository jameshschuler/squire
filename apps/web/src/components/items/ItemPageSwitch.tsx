import { Link } from "@tanstack/react-router";
import { ITEM_PAGES } from "@/lib/layout";

export function ItemPageSwitch() {
  return (
    <nav aria-label="Item type" className="mt-3 grid grid-cols-3 rounded-lg bg-muted p-1 text-sm">
      {ITEM_PAGES.map(({ path, label }) => (
        <Link
          key={path}
          to={path}
          className="rounded-md py-1.5 text-center text-muted-foreground"
          activeProps={{ className: "bg-background font-medium text-foreground shadow-sm" }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
