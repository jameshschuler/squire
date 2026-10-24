import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import exportFixture from "../../../fixtures/character/export.json";
import { GearPage } from "@/components/gear/GearPage";
import { CharacterProvider } from "@/contexts/character-context";
import { CHARACTER_STORAGE_KEY, storeCharacter } from "@/lib/character";
import { renderWithRouter } from "./render-with-router";

const renderPage = () =>
  renderWithRouter(
    <CharacterProvider>
      <GearPage />
    </CharacterProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Gear page", () => {
  it("shows the gear chat as coming soon", async () => {
    await renderPage();
    expect(screen.getByText("Gear optimizer coming soon.")).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Ask about gear" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(true);
  });

  it("points to the character page when no character is saved", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Add your character" }).getAttribute("href")).toBe("/character");
  });

  it("doesn't ask for a character once one is saved", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, storeCharacter(JSON.stringify(exportFixture), new Date()));
    await renderPage();
    expect(screen.queryByRole("link", { name: "Add your character" })).toBeNull();
  });
});
