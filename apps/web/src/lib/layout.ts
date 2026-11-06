const DETAIL_PAGE = /^\/(recipes|items)\//;

export const ITEM_PAGES = [
  { path: "/materials", label: "Materials" },
  { path: "/food", label: "Food" },
  { path: "/loot", label: "Loot" },
] as const;

export type ItemPage = (typeof ITEM_PAGES)[number]["path"];

export type Tab = "recipes" | "items" | "activities" | "gear";

export type ListPage = "/" | ItemPage | "/activities" | "/gear";

const LIST_PAGE_TABS = new Map<string, Tab>([
  ["/", "recipes"],
  ...ITEM_PAGES.map(({ path }) => [path, "items"] as const),
  ["/activities", "activities"],
  ["/gear", "gear"],
]);

const isAt = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export function itemPage(pathname: string): ItemPage | undefined {
  return ITEM_PAGES.find(({ path }) => isAt(pathname, path))?.path;
}

export function activeTab(pathname: string, previousTab: Tab): Tab | undefined {
  if (DETAIL_PAGE.test(pathname)) {
    return previousTab;
  }

  if (isAt(pathname, "/about") || isAt(pathname, "/character") || isAt(pathname, "/pets")) {
    return undefined;
  }

  if (itemPage(pathname)) {
    return "items";
  }

  if (isAt(pathname, "/activities")) {
    return "activities";
  }

  if (isAt(pathname, "/gear")) {
    return "gear";
  }

  return "recipes";
}

// The tab whose search list this page is, so the tab can reopen it with its search. Detail pages
// aren't list pages.
export function listPageTab(pathname: string): Tab | undefined {
  return LIST_PAGE_TABS.get(pathname);
}
