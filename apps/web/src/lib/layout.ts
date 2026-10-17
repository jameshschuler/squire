const DETAIL_PAGE = /^\/(recipes|items)\//;

export function showsFooter(pathname: string): boolean {
  return !DETAIL_PAGE.test(pathname);
}

export type Tab = "/" | "/materials" | "/food" | "/favorites";

export function activeTab(pathname: string, previousTab: Tab): Tab {
  if (DETAIL_PAGE.test(pathname)) {
    return previousTab;
  }
  if (pathname.startsWith("/materials")) {
    return "/materials";
  }
  if (pathname.startsWith("/food")) {
    return "/food";
  }
  return pathname.startsWith("/favorites") ? "/favorites" : "/";
}
