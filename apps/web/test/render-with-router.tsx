import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";

window.scrollTo = () => {};

export async function renderWithRouter(ui: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory(),
  });
  const result = render(<RouterProvider router={router} />);
  await router.load();
  return result;
}
