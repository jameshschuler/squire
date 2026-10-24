const DETAIL_PAGE = /^\/(recipes|items)\//;

export const ITEM_PAGES = [
  { path: "/materials", label: "Materials" },
  { path: "/food", label: "Food" },
  { path: "/loot", label: "Loot" },
] as const;

export type ItemPage = (typeof ITEM_PAGES)[number]["path"];

export type Tab = "recipes" | "items" | "activities" | "gear";

const isAt = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

export function itemPage(pathname: string): ItemPage | undefined {
  return ITEM_PAGES.find(({ path }) => isAt(pathname, path))?.path;
}

export function activeTab(pathname: string, previousTab: Tab): Tab | undefined {
  if (DETAIL_PAGE.test(pathname)) {
    return previousTab;
  }
  if (isAt(pathname, "/about")) {
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
