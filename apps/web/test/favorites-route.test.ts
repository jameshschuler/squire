import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

describe("/favorites", () => {
  it("sends old links to the Favorites chip on the Recipes tab", async () => {
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/favorites"] }) });
    await router.load();
    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toEqual({ skill: "favorites" });
  });
});
