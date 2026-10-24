import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Link } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const tab = (name: string) => screen.getByRole("link", { name });

const renderWithLinks = () =>
  renderWithRouter(
    <>
      <BottomTabBar />
      <Link to="/food">Food page</Link>
      <Link to="/items/$itemId" params={{ itemId: "bread" }}>
        Bread
      </Link>
      <Link to="/about">About page</Link>
    </>,
  );

describe("BottomTabBar", () => {
  it("has Recipes, Items, Activities and Gear tabs, with recipes active on the home page", async () => {
    await renderWithRouter(<BottomTabBar />);
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Recipes",
      "Items",
      "Activities",
      "Gear",
    ]);
    expect(tab("Recipes").getAttribute("href")).toBe("/");
    expect(tab("Items").getAttribute("href")).toBe("/materials");
    expect(tab("Activities").getAttribute("href")).toBe("/activities");
    expect(tab("Gear").getAttribute("href")).toBe("/gear");
    expect(tab("Recipes").getAttribute("aria-current")).toBe("page");
  });

  it("marks items active on any item page and reopens the last one", async () => {
    await renderWithLinks();
    fireEvent.click(tab("Food page"));
    await waitFor(() => expect(tab("Items").getAttribute("aria-current")).toBe("page"));
    expect(tab("Items").getAttribute("href")).toBe("/food");
  });

  it("keeps items active on an item opened from an item page", async () => {
    await renderWithLinks();
    fireEvent.click(tab("Food page"));
    await waitFor(() => expect(tab("Items").getAttribute("aria-current")).toBe("page"));
    fireEvent.click(tab("Bread"));
    await waitFor(() => expect(tab("Bread").getAttribute("aria-current")).toBe("page"));
    expect(tab("Items").getAttribute("aria-current")).toBe("page");
    expect(tab("Recipes").getAttribute("aria-current")).toBeNull();
  });

  it("reopens the last item page after leaving the Items tab", async () => {
    await renderWithLinks();
    fireEvent.click(tab("Food page"));
    await waitFor(() => expect(tab("Items").getAttribute("aria-current")).toBe("page"));
    fireEvent.click(tab("Gear"));
    await waitFor(() => expect(tab("Gear").getAttribute("aria-current")).toBe("page"));
    expect(tab("Items").getAttribute("href")).toBe("/food");
  });

  it("marks no tab current on the About page, then picks up where it left off", async () => {
    await renderWithLinks();
    fireEvent.click(tab("Gear"));
    await waitFor(() => expect(tab("Gear").getAttribute("aria-current")).toBe("page"));
    fireEvent.click(tab("About page"));
    await waitFor(() => expect(tab("About page").getAttribute("aria-current")).toBe("page"));
    expect(screen.getByRole("navigation", { name: "Main" }).querySelector('[aria-current="page"]')).toBeNull();
    fireEvent.click(tab("Bread"));
    await waitFor(() => expect(tab("Gear").getAttribute("aria-current")).toBe("page"));
  });
});
