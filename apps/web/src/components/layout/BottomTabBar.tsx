import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Footprints, Gem, Sparkles } from "lucide-react";
import { activeTab as tabFor, listPageTab, type ListPage, type Tab } from "@/lib/layout";
import { cn } from "@/lib/utils";

const TABS = [
  { tab: "recipes", to: "/", label: "Recipes", Icon: BookOpen },
  { tab: "items", to: "/materials", label: "Items", Icon: Gem },
  { tab: "activities", to: "/activities", label: "Activities", Icon: Footprints },
  { tab: "gear", to: "/gear", label: "Gear", Icon: Sparkles },
] as const;

interface Place {
  to: ListPage;
  search: Record<string, unknown>;
  searchStr: string;
}

const FIRST_PLACES = Object.fromEntries(TABS.map(({ tab, to }) => [tab, { to, search: {}, searchStr: "" }])) as Record<
  Tab,
  Place
>;

// Each tab reopens the list page it was last on, with that page's search.
export function BottomTabBar() {
  const location = useRouterState({ select: (state) => state.location });
  const [lastTab, setLastTab] = useState<Tab>("recipes");
  const [places, setPlaces] = useState(FIRST_PLACES);
  const activeTab = tabFor(location.pathname, lastTab);
  const listTab = listPageTab(location.pathname);

  if (activeTab && activeTab !== lastTab) {
    setLastTab(activeTab);
  }

  if (listTab && (places[listTab].to !== location.pathname || places[listTab].searchStr !== location.searchStr)) {
    const place = { to: location.pathname as ListPage, search: location.search, searchStr: location.searchStr };

    setPlaces({ ...places, [listTab]: place });
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ tab, label, Icon }) => (
          <Link
            key={tab}
            to={places[tab].to}
            search={places[tab].search as never}
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
