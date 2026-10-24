import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Link } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const tab = (name: string) => screen.getByRole("link", { name });

describe("BottomTabBar", () => {
  it("links to each tab, with recipes active on the home page", async () => {
    await renderWithRouter(<BottomTabBar />);
    expect(tab("Recipes").getAttribute("href")).toBe("/");
    expect(tab("Materials").getAttribute("href")).toBe("/materials");
    expect(tab("Food").getAttribute("href")).toBe("/food");
    expect(tab("Loot").getAttribute("href")).toBe("/loot");
    expect(tab("Gear").getAttribute("href")).toBe("/gear");
    expect(tab("Recipes").getAttribute("aria-current")).toBe("page");
    expect(tab("Loot").getAttribute("aria-current")).toBeNull();
  });

  it("marks materials active after navigating there", async () => {
    await renderWithRouter(<BottomTabBar />);
    fireEvent.click(tab("Materials"));
    await waitFor(() => expect(tab("Materials").getAttribute("aria-current")).toBe("page"));
  });

  it("has no favorites tab", async () => {
    await renderWithRouter(<BottomTabBar />);
    expect(screen.queryByRole("link", { name: "Favorites" })).toBeNull();
  });

  it("keeps materials active on an item opened from the materials tab", async () => {
    await renderWithRouter(
      <>
        <BottomTabBar />
        <Link to="/items/$itemId" params={{ itemId: "bones" }}>
          Bones
        </Link>
      </>,
    );
    fireEvent.click(tab("Materials"));
    await waitFor(() => expect(tab("Materials").getAttribute("aria-current")).toBe("page"));
    fireEvent.click(screen.getByRole("link", { name: "Bones" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Bones" }).getAttribute("aria-current")).toBe("page"));
    expect(tab("Materials").getAttribute("aria-current")).toBe("page");
    expect(tab("Recipes").getAttribute("aria-current")).toBeNull();
  });
});
