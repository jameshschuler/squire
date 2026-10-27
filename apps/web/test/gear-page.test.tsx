import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { GEAR_DATA_SCHEMA, buildGearData } from "@squire/api/gear-data";
import type { GameData } from "@squire/api/recipe-book";
import exportFixture from "../../../fixtures/character/export.json";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { GearPage } from "@/components/gear/GearPage";
import { CharacterProvider } from "@/contexts/character-context";
import { GearDataProvider } from "@/contexts/gear-data-context";
import { CHARACTER_STORAGE_KEY, storeCharacter } from "@/lib/character";
import { renderWithRouter } from "./render-with-router";

const renderPage = () =>
  renderWithRouter(
    <CharacterProvider>
      <GearDataProvider>
        <GearPage />
      </GearDataProvider>
    </CharacterProvider>,
  );

const gear = buildGearData(sample as unknown as GameData);
const fetchMock = vi.fn(async () => new Response(JSON.stringify(gear)));

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

  it("shows a loading line while the gear data downloads", async () => {
    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));
    await renderPage();
    expect(await screen.findByText("Loading gear data…")).toBeDefined();
  });

  it("loads the gear data when the page opens", async () => {
    await renderPage();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`/api/gear\\?schema=${GEAR_DATA_SCHEMA}$`)),
    );
    await waitFor(() => expect(screen.queryByText("Loading gear data…")).toBeNull());
  });

  it("says when the gear data fails to load", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("", { status: 503 }));
    await renderPage();
    expect(await screen.findByText("Failed to load gear data (503)")).toBeDefined();
  });
});
