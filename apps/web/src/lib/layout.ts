const DETAIL_PAGE = /^\/(recipes|items)\//;

export function showsFooter(pathname: string): boolean {
  return !DETAIL_PAGE.test(pathname);
}
