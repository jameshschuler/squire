import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { ItemPageSwitch } from "@/components/items/ItemPageSwitch";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

describe("ItemPageSwitch", () => {
  it("links to materials, food and loot", async () => {
    await renderWithRouter(<ItemPageSwitch />);
    const nav = screen.getByRole("navigation", { name: "Item type" });
    expect([...nav.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Materials", "/materials"],
      ["Food", "/food"],
      ["Loot", "/loot"],
    ]);
  });
});
