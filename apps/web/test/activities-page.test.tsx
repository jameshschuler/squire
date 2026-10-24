import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ActivitiesPage } from "@/components/activities/ActivitiesPage";

afterEach(cleanup);

describe("ActivitiesPage", () => {
  it("says activities are coming soon", () => {
    render(<ActivitiesPage />);
    expect(screen.getByText("Activities coming soon.")).toBeDefined();
  });
});
