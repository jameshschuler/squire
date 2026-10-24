import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { RECIPE_BOOK_SCHEMA, type ItemWithEffects } from "@squire/api/recipe-book";
import exportFixture from "../../../fixtures/character/export.json";
import { CharacterPage } from "@/components/character/CharacterPage";
import { CharacterProvider } from "@/contexts/character-context";
import { GameDataProvider } from "@/contexts/game-data-context";
import { CHARACTER_STORAGE_KEY, readStoredCharacter, storeCharacter } from "@/lib/character";
import { renderWithRouter } from "./render-with-router";

const exportText = JSON.stringify(exportFixture);
const saved = storeCharacter(exportText, new Date("2026-10-24T21:41:00Z"));

const lootItem = (id: string, name: string, isCollectible: boolean): ItemWithEffects => ({
  id,
  name,
  icon: "",
  quality: "common",
  isCollectible,
  keywords: [],
  effects: null,
});

const book = {
  schema: RECIPE_BOOK_SCHEMA,
  version: "v1",
  recipes: [],
  sources: {},
  foods: [],
  gear: [],
  loot: [
    lootItem("soup_kitchen_badge", "Soup kitchen badge", true),
    lootItem("ancient_ankh", "Ancient ankh", true),
    lootItem("lost_timmys_sand_shovel", "Lost Timmy's sand shovel", true),
    lootItem("absorbing_amulet", "Absorbing amulet", false),
  ],
};

const serveGameData = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(book))),
  );

const renderPage = () =>
  renderWithRouter(
    <GameDataProvider>
      <CharacterProvider>
        <CharacterPage />
      </CharacterProvider>
    </GameDataProvider>,
  );

const paste = (text: string) => fireEvent.change(screen.getByLabelText("Character data"), { target: { value: text } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save character" }));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Character page", () => {
  it("asks for the character export when none is saved", async () => {
    await renderPage();
    expect(screen.getByText(/Settings → Character → Export character data/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Save character" }).hasAttribute("disabled")).toBe(true);
  });

  it("saves a pasted export to the device and shows the character", async () => {
    await renderPage();
    paste(exportText);
    save();
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
    expect([...document.querySelectorAll("dl dt")].map((label) => label.textContent)).toEqual([
      "Character level",
      "Steps walked",
      "Collectibles",
      "Achievement points",
    ]);
    const stats = Object.fromEntries(
      [...document.querySelectorAll("dl > div")].map((stat) => [
        stat.querySelector("dt")?.textContent,
        stat.querySelector("dd")?.textContent,
      ]),
    );
    expect(stats).toEqual({
      "Character level": "80",
      Collectibles: "2",
      "Steps walked": "9,135,913",
      "Achievement points": "231",
    });
    expect(screen.getByText("Total skill level").nextElementSibling?.textContent).toBe("256");
    expect(screen.getByRole("list", { name: "Skill levels" }).textContent).toContain("Cooking71");
    expect(readStoredCharacter(localStorage.getItem(CHARACTER_STORAGE_KEY))?.character.name).toBe("Test Walker");
  });

  it("explains what's wrong with a bad paste and saves nothing", async () => {
    await renderPage();
    paste('{"name":"x"}');
    save();
    expect(screen.getByText("That isn't a WalkScape character export.")).toBeDefined();
    expect(screen.getByLabelText("Character data").getAttribute("aria-invalid")).toBe("true");
    expect(localStorage.getItem(CHARACTER_STORAGE_KEY)).toBeNull();
  });

  it("shows the saved character on a later visit, with when it was imported", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
    expect(screen.getByText("Imported Oct 24, 2026, 9:41 PM")).toBeDefined();
  });

  it("records when a pasted export was imported", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T08:05:00Z"));
    await renderPage();
    paste(exportText);
    save();
    expect(screen.getByText("Imported Oct 25, 2026, 8:05 AM")).toBeDefined();
    expect(readStoredCharacter(localStorage.getItem(CHARACTER_STORAGE_KEY))?.savedAt).toBe("2026-10-25T08:05:00.000Z");
  });

  it("replaces the character with a newer export", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    paste(JSON.stringify({ ...exportFixture, name: "Renamed Walker" }));
    save();
    expect(screen.getByRole("heading", { name: "Renamed Walker" })).toBeDefined();
  });

  it("keeps the character when an update is cancelled", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("removes the character from the device after confirming", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Remove character" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByLabelText("Character data")).toBeDefined();
    expect(localStorage.getItem(CHARACTER_STORAGE_KEY)).toBeNull();
  });

  it("picks up a character saved in another tab", async () => {
    await renderPage();
    act(() => {
      localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
      dispatchEvent(new StorageEvent("storage", { key: CHARACTER_STORAGE_KEY }));
    });
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("says so when the device won't store the character", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    await renderPage();
    paste(exportText);
    save();
    expect(screen.getByText(/Couldn't save your character on this device/)).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Test Walker" })).toBeNull();
  });

  it("shows the new character after saving, even if the old one was removed mid-update", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    act(() => {
      localStorage.removeItem(CHARACTER_STORAGE_KEY);
      dispatchEvent(new StorageEvent("storage", { key: CHARACTER_STORAGE_KEY }));
    });
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    paste(exportText);
    save();
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("shows every collectible, owned or not, once game data loads", async () => {
    serveGameData();
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    const list = await screen.findByRole("list", { name: "Collectibles" });
    expect(
      [...list.querySelectorAll("a")].map((link) => [link.getAttribute("aria-label"), link.getAttribute("href")]),
    ).toEqual([
      ["Ancient ankh, not found yet", "/items/ancient_ankh"],
      ["Lost Timmy's sand shovel", "/items/lost_timmys_sand_shovel"],
      ["Soup kitchen badge", "/items/soup_kitchen_badge"],
    ]);
    expect(screen.getByText("Collectibles · 2 of 3")).toBeDefined();
    expect(screen.queryByText("2 of 3")).toBeNull();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows the owned count on the card, and no grid until game data loads", async () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, saved);
    await renderPage();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Collectibles" })).toBeNull();
  });
});
