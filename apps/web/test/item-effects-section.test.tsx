import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ItemEffectsSection } from "@/components/shared/ItemEffectsSection";

afterEach(cleanup);

describe("ItemEffectsSection", () => {
  it("puts the duration in the heading and the fine value after each effect", () => {
    render(<ItemEffectsSection effects={{ steps: 1000, effects: [{ text: "+3% work efficiency", fine: "+6%" }] }} />);
    expect(screen.getByRole("heading").textContent).toBe("Effects · 1,000 steps");
    expect(screen.getByRole("listitem").textContent).toBe("+3% work efficiency +6% fine");
  });

  it("leaves out the fine value when it's the same as the normal one", () => {
    render(<ItemEffectsSection effects={{ steps: 1000, effects: [{ text: "+5% work efficiency", fine: null }] }} />);
    expect(screen.getByRole("listitem").textContent).toBe("+5% work efficiency");
  });

  it("titles the section plainly when the duration isn't in steps", () => {
    render(<ItemEffectsSection effects={{ steps: null, effects: [{ text: "+5% work efficiency", fine: null }] }} />);
    expect(screen.getByRole("heading").textContent).toBe("Effects");
  });
});
