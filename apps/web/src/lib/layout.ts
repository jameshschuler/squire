const DETAIL_PAGE = /^\/(recipes|items)\//;

export function showsFooter(pathname: string): boolean {
  return !DETAIL_PAGE.test(pathname);
}

export type Tab = "/" | "/materials" | "/favorites";

export function activeTab(pathname: string, previousTab: Tab): Tab {
  if (DETAIL_PAGE.test(pathname)) {
    return previousTab;
  }
  if (pathname.startsWith("/materials")) {
    return "/materials";
  }
  return pathname.startsWith("/favorites") ? "/favorites" : "/";
}
