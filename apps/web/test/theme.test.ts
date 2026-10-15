import { describe, expect, it } from "vitest";
import { nextTheme, parseTheme, resolveTheme } from "@/lib/theme";

describe("parseTheme", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    [null, "system"],
    ["purple", "system"],
  ] as const)("reads %s as %s", (stored, expected) => {
    expect(parseTheme(stored)).toBe(expected);
  });
});

describe("resolveTheme", () => {
  it("follows the system preference for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the system preference for an explicit choice", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});
