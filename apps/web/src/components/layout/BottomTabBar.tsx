import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Gem, Shield } from "lucide-react";
import { activeTab as tabFor, itemPage, type ItemPage, type Tab } from "@/lib/layout";
import { cn } from "@/lib/utils";

const TABS = [
  { tab: "recipes", to: "/", label: "Recipes", Icon: BookOpen },
  { tab: "items", to: "/materials", label: "Items", Icon: Gem },
  { tab: "gear", to: "/gear", label: "Gear", Icon: Shield },
] as const;

export function BottomTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [lastTab, setLastTab] = useState<Tab>("recipes");
  const [lastItemPage, setLastItemPage] = useState<ItemPage>("/materials");
  const activeTab = tabFor(pathname, lastTab);
  const currentItemPage = itemPage(pathname);
  if (activeTab && activeTab !== lastTab) {
    setLastTab(activeTab);
  }
  if (currentItemPage && currentItemPage !== lastItemPage) {
    setLastItemPage(currentItemPage);
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ tab, to, label, Icon }) => (
          <Link
            key={tab}
            to={tab === "items" ? lastItemPage : to}
            aria-current={activeTab === tab ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground",
              activeTab === tab && "text-foreground",
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
