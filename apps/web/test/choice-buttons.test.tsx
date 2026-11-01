import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChoiceButtons } from "@/components/gear/ChoiceButtons";

afterEach(cleanup);

describe("ChoiceButtons", () => {
  it.each([
    ["without", undefined],
    ["with", "+12% work efficiency"],
  ])("lets a long choice %s a detail line wrap instead of overflowing", (_, detail) => {
    const choices = [
      { value: "tidal_cave", label: "Tidal cave of the forgotten merfolk", hint: "Sunken Isles", detail },
    ];

    render(<ChoiceButtons choices={choices} onChoose={() => {}} />);

    const button = screen.getByRole("button");

    expect(button.classList.contains("whitespace-normal")).toBe(true);
    expect(button.classList.contains("max-w-full")).toBe(true);
  });
});
