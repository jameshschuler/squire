import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RecipeSearchInput } from "@/components/recipes/RecipeSearchInput";

afterEach(cleanup);

function ControlledSearch({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <RecipeSearchInput value={value} onChange={setValue} />;
}

describe("RecipeSearchInput", () => {
  it("hides the clear button when the search is empty", () => {
    render(<ControlledSearch initial="" />);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("shows the clear button whenever there is text, even without focus", () => {
    render(<ControlledSearch initial="hatchet" />);
    screen.getByRole("searchbox").blur();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeDefined();
  });

  it("clears the search and puts the cursor back in the field", () => {
    render(<ControlledSearch initial="hatchet" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    const input = screen.getByRole("searchbox");
    expect((input as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });
});
