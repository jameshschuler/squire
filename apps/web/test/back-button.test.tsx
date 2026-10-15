import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { BackButton } from "@/components/layout/BackButton";

window.scrollTo = () => {};

afterEach(cleanup);

async function renderAt(initialEntries: string[]) {
  const rootRoute = createRootRoute();
  const page = (path: string) => createRoute({ getParentRoute: () => rootRoute, path, component: BackButton });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page("/"), page("/favorites"), page("/recipes/$recipeId")]),
    history: createMemoryHistory({ initialEntries }),
  });
  render(<RouterProvider router={router} />);
  await router.load();
  return router;
}

describe("BackButton", () => {
  it("goes back to the previous page", async () => {
    const router = await renderAt(["/favorites"]);
    await router.navigate({ to: "/recipes/$recipeId", params: { recipeId: "bake_bread" } });
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/favorites"));
  });

  it("goes to search when there's no page to go back to", async () => {
    const router = await renderAt(["/recipes/bake_bread"]);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});
