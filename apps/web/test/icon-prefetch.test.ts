import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecipeBook } from "@squire/api/recipe-book";
import { ICONS_PREFETCHED_KEY, prefetchIcons, prefetchRecipeBookIcons } from "@/lib/icon-prefetch";

const ok = () => Promise.resolve(new Response(null, { status: 200 }));

const book: RecipeBook = {
  schema: 2,
  version: "v1",
  activities: [],
  gearItems: [],
  skills: [],
  locations: [],
  foods: [],
  loot: [],
  gear: [],
  recipes: [
    {
      id: "r",
      name: "R",
      icon: "recipe.png",
      skills: [],
      service: null,
      materials: [
        [
          {
            id: "m",
            name: "M",
            icon: "material.png",
            quality: null,
            isCollectible: false,
            keywords: [],
            amount: 1,
          },
        ],
      ],
      outputs: [
        {
          id: "o",
          name: "O",
          icon: "recipe.png",
          quality: null,
          isCollectible: false,
          keywords: [],
          amount: 1,
        },
      ],
      xp: [],
      workRequired: 1,
      maxWorkEfficiency: 1,
    },
  ],
  sources: {},
};

describe("prefetchIcons", () => {
  it("fetches every URL with at most 6 requests in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchIcon = vi.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return new Response(null);
    });
    const urls = Array.from({ length: 20 }, (_, i) => `/api/icons/${i}.png`);
    await expect(prefetchIcons(urls, fetchIcon)).resolves.toBe(0);
    expect(fetchIcon).toHaveBeenCalledTimes(20);
    expect(peak).toBe(6);
  });

  it("counts failed responses and network errors", async () => {
    const replies = [ok(), Promise.resolve(new Response(null, { status: 502 })), Promise.reject(new Error("offline"))];
    await expect(prefetchIcons(["a", "b", "c"], () => replies.shift()!)).resolves.toBe(2);
  });

  it("does nothing for an empty list", async () => {
    const fetchIcon = vi.fn(ok);
    await expect(prefetchIcons([], fetchIcon)).resolves.toBe(0);
    expect(fetchIcon).not.toHaveBeenCalled();
  });
});

describe("prefetchRecipeBookIcons", () => {
  const fetchMock = vi.fn((_url: string) => ok());

  function controlledByServiceWorker(controlled: boolean) {
    vi.stubGlobal("navigator", { serviceWorker: { controller: controlled ? {} : null } });
  }

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each icon once and remembers the version", async () => {
    controlledByServiceWorker(true);
    await prefetchRecipeBookIcons(book);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/icons/recipe.png", "/api/icons/material.png"]);
    expect(localStorage.getItem(ICONS_PREFETCHED_KEY)).toBe("2-v1");
  });

  it("skips when this version was already prefetched", async () => {
    controlledByServiceWorker(true);
    localStorage.setItem(ICONS_PREFETCHED_KEY, "2-v1");
    await prefetchRecipeBookIcons(book);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefetches again when the book's schema changes, even for the same data version", async () => {
    controlledByServiceWorker(true);
    localStorage.setItem(ICONS_PREFETCHED_KEY, "1-v1");
    await prefetchRecipeBookIcons(book);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("skips when no service worker controls the page, since nothing would cache the icons", async () => {
    controlledByServiceWorker(false);
    await prefetchRecipeBookIcons(book);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tries again next time when an icon fails", async () => {
    controlledByServiceWorker(true);
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    await prefetchRecipeBookIcons(book);
    expect(localStorage.getItem(ICONS_PREFETCHED_KEY)).toBeNull();
  });
});
