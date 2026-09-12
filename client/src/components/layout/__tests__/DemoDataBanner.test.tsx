import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoDataBanner } from "../DemoDataBanner";
import { useAuthStore } from "../../../store/authStore";

function setUser(overrides: Partial<ReturnType<typeof useAuthStore.getState>["user"]> | null) {
  useAuthStore.setState({
    user: overrides
      ? { id: "1", username: "demo_streamer", displayName: "Demo Streamer", profileImageUrl: null, isDemo: true, ...overrides }
      : null,
  } as Partial<ReturnType<typeof useAuthStore.getState>>);
}

describe("DemoDataBanner", () => {
  it("shows the data-reset warning for a demo account", () => {
    setUser({ isDemo: true });
    render(<DemoDataBanner />);
    expect(screen.getByText(/can be reset the next time this deployment updates/)).toBeInTheDocument();
  });

  it("renders nothing for a non-demo (real Twitch) account", () => {
    setUser({ isDemo: false });
    render(<DemoDataBanner />);
    expect(screen.queryByText(/can be reset/)).not.toBeInTheDocument();
  });

  it("renders nothing when logged out", () => {
    setUser(null);
    render(<DemoDataBanner />);
    expect(screen.queryByText(/can be reset/)).not.toBeInTheDocument();
  });

  it("can be dismissed and stays dismissed for the rest of the session", async () => {
    setUser({ isDemo: true });
    const user = userEvent.setup();
    render(<DemoDataBanner />);
    expect(screen.getByText(/can be reset/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByText(/can be reset/)).not.toBeInTheDocument();
  });
});
