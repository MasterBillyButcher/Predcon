import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PredictCreate } from "../PredictCreate";
import { mockApi } from "../../test/mockServer";

function renderPage() {
  return render(
    <MemoryRouter>
      <PredictCreate />
    </MemoryRouter>,
  );
}

describe("PredictCreate", () => {
  beforeEach(() => {
    mockApi({});
  });

  it("shows a validation error beside the question field when submitted empty", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create and start/i }));

    expect(await screen.findByText("Question is required")).toBeInTheDocument();
  });

  it("rejects duplicate outcome labels", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("What will happen next?"), "Who wins?");
    await user.type(screen.getByPlaceholderText("Outcome 1"), "Team A");
    await user.type(screen.getByPlaceholderText("Outcome 2"), "team a");
    await user.click(screen.getByRole("button", { name: /create and start/i }));

    expect(await screen.findByText("Outcomes must be unique")).toBeInTheDocument();
  });

  it("supports adding a third and fourth outcome, up to the max of four", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Add outcome"));
    expect(screen.getByPlaceholderText("Outcome 3")).toBeInTheDocument();

    await user.click(screen.getByText("Add outcome"));
    expect(screen.getByPlaceholderText("Outcome 4")).toBeInTheDocument();

    // The "Add outcome" affordance disappears once 4 outcomes exist.
    expect(screen.queryByText("Add outcome")).not.toBeInTheDocument();
  });

  it("does not allow removing below 2 outcomes", () => {
    renderPage();
    // Only 2 outcomes exist by default, so no remove buttons are rendered.
    expect(screen.queryByLabelText(/remove outcome/i)).not.toBeInTheDocument();
  });

  it("lets a duration preset be selected", async () => {
    const user = userEvent.setup();
    renderPage();
    const fiveMin = screen.getByRole("button", { name: "5 min" });
    await user.click(fiveMin);
    expect(fiveMin.className).toMatch(/border-accent/);
  });

  it("flags a maxPoints value lower than minPoints", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("What will happen next?"), "Who wins?");
    await user.type(screen.getByPlaceholderText("Outcome 1"), "Team A");
    await user.type(screen.getByPlaceholderText("Outcome 2"), "Team B");

    const minInput = screen.getByLabelText("Minimum participation");
    await user.clear(minInput);
    await user.type(minInput, "100");

    const maxInput = screen.getByLabelText(/Maximum participation/);
    await user.clear(maxInput);
    await user.type(maxInput, "10");

    await user.click(screen.getByRole("button", { name: /create and start/i }));

    expect(await screen.findByText("Maximum must be at least the minimum")).toBeInTheDocument();
  });
});
