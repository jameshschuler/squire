import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GEAR_DATA_SCHEMA } from "@squire/api/gear-data";
import { GearDataProvider, useGearDataContext } from "@/contexts/gear-data-context";

const gear = {
  schema: GEAR_DATA_SCHEMA,
  version: "v1",
  items: [],
  pets: [],
  bannedKeywords: {},
  skills: [],
  locations: [],
};
const fetchMock = vi.fn(async () => new Response(JSON.stringify(gear)));

function Status() {
  const state = useGearDataContext();
  return <p>{state.status === "error" ? state.message : state.status}</p>;
}

function Page({ show }: { show: boolean }) {
  return <GearDataProvider>{show && <Status />}</GearDataProvider>;
}

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GearDataProvider", () => {
  it("loads nothing until a page asks for gear data", () => {
    render(<Page show={false} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads once, even when the page opens again", async () => {
    const { rerender } = render(<Page show />);
    expect(await screen.findByText("ready")).toBeDefined();
    rerender(<Page show={false} />);
    rerender(<Page show />);
    expect(screen.getByText("ready")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("tries again the next time the page opens after a failure", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("", { status: 503 }));
    const { rerender } = render(<Page show />);
    expect(await screen.findByText("Failed to load gear data (503)")).toBeDefined();
    rerender(<Page show={false} />);
    rerender(<Page show />);
    expect(await screen.findByText("ready")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
