import { recipeBookIcons, type RecipeBook } from "@jameshschuler/walkscape-sdk";
import { iconUrl } from "./api";

export const ICONS_PREFETCHED_KEY = "squire-icons-prefetched";

const CONCURRENCY = 6;

export async function prefetchIcons(urls: string[], fetchIcon: (url: string) => Promise<Response>): Promise<number> {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++]!;
      const ok = await fetchIcon(url).then(
        (res) => res.ok,
        () => false,
      );
      if (!ok) {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return failed;
}

export async function prefetchRecipeBookIcons(book: RecipeBook): Promise<void> {
  const prefetchedKey = `${book.schema}-${book.version}`;
  if (!navigator.serviceWorker?.controller || localStorage.getItem(ICONS_PREFETCHED_KEY) === prefetchedKey) {
    return;
  }
  const failed = await prefetchIcons(recipeBookIcons(book).map(iconUrl), (url) => fetch(url));
  if (failed === 0) {
    localStorage.setItem(ICONS_PREFETCHED_KEY, prefetchedKey);
  }
}
