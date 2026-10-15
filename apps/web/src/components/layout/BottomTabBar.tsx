import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Recipes", Icon: BookOpen },
  { to: "/favorites", label: "Favorites", Icon: Star },
] as const;

export function BottomTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeTab = pathname.startsWith("/favorites") ? "/favorites" : "/";

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={activeTab === to ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground",
              activeTab === to && "text-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
