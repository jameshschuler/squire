import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import exportFixture from "../../../fixtures/character/export.json";
import { GearPage } from "@/components/gear/GearPage";
import { CharacterProvider } from "@/contexts/character-context";
import { CHARACTER_STORAGE_KEY } from "@/lib/character";

const exportText = JSON.stringify(exportFixture);

const renderPage = () =>
  render(
    <CharacterProvider>
      <GearPage />
    </CharacterProvider>,
  );

const paste = (text: string) => fireEvent.change(screen.getByLabelText("Character data"), { target: { value: text } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save character" }));

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Gear page", () => {
  it.each([
    ["no character is saved", null],
    ["a character is saved", exportText],
  ])("says the gear optimizer is coming when %s", (_, stored) => {
    if (stored) {
      localStorage.setItem(CHARACTER_STORAGE_KEY, stored);
    }
    renderPage();
    expect(screen.getByText("Gear optimizer coming soon.")).toBeDefined();
  });

  it("asks for the character export when none is saved", () => {
    renderPage();
    expect(screen.getByText(/Settings → Character → Export character data/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Save character" }).hasAttribute("disabled")).toBe(true);
  });

  it("saves a pasted export to the device and shows the character", () => {
    renderPage();
    paste(exportText);
    save();
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
    expect(screen.getByText("Character level 80 · 6 tool slots")).toBeDefined();
    expect(screen.getByText("9,135,913 steps walked · 231 achievement points")).toBeDefined();
    expect(screen.getByRole("list", { name: "Skill levels" }).textContent).toContain("Cooking71");
    expect(localStorage.getItem(CHARACTER_STORAGE_KEY)).toBe(exportText);
  });

  it("explains what's wrong with a bad paste and saves nothing", () => {
    renderPage();
    paste('{"name":"x"}');
    save();
    expect(screen.getByText("That isn't a WalkScape character export.")).toBeDefined();
    expect(screen.getByLabelText("Character data").getAttribute("aria-invalid")).toBe("true");
    expect(localStorage.getItem(CHARACTER_STORAGE_KEY)).toBeNull();
  });

  it("shows the saved character on a later visit", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
    renderPage();
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("replaces the character with a newer export", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    paste(JSON.stringify({ ...exportFixture, name: "Renamed Walker" }));
    save();
    expect(screen.getByRole("heading", { name: "Renamed Walker" })).toBeDefined();
  });

  it("keeps the character when an update is cancelled", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("removes the character from the device after confirming", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Remove character" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByLabelText("Character data")).toBeDefined();
    expect(localStorage.getItem(CHARACTER_STORAGE_KEY)).toBeNull();
  });

  it("picks up a character saved in another tab", () => {
    renderPage();
    act(() => {
      localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
      dispatchEvent(new StorageEvent("storage", { key: CHARACTER_STORAGE_KEY }));
    });
    expect(screen.getByRole("heading", { name: "Test Walker" })).toBeDefined();
  });

  it("says so when the device won't store the character", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    renderPage();
    paste(exportText);
    save();
    expect(screen.getByText(/Couldn't save your character on this device/)).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Test Walker" })).toBeNull();
  });

  it("shows the new character after saving, even if the old one was removed mid-update", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, exportText);
    renderPage();
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
});
