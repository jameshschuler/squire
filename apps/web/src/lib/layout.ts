const DETAIL_PAGE = /^\/(recipes|items)\//;

export function showsFooter(pathname: string): boolean {
  return !DETAIL_PAGE.test(pathname);
}

export function activeTab(pathname: string): "/" | "/materials" | "/favorites" {
  if (pathname.startsWith("/materials")) {
    return "/materials";
  }
  return pathname.startsWith("/favorites") ? "/favorites" : "/";
}
