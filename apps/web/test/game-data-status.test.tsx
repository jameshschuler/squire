import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameDataStatus } from "@/components/shared/GameDataStatus";

afterEach(cleanup);

describe("GameDataStatus", () => {
  it("says game data is loading", () => {
    render(<GameDataStatus state={{ status: "loading" }} />);
    expect(screen.getByText("Loading game data…")).toBeDefined();
  });

  it("shows the error message", () => {
    render(<GameDataStatus state={{ status: "error", message: "Failed to load game data (502)" }} />);
    expect(screen.getByText("Failed to load game data (502)")).toBeDefined();
  });
});
