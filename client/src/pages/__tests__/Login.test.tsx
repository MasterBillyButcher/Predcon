import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../Login";
import { useAuthStore } from "../../store/authStore";

function resetStore(overrides: Partial<ReturnType<typeof useAuthStore.getState>> = {}) {
  useAuthStore.setState({
    user: null,
    status: "unauthenticated",
    demoModeEnabled: true,
    twitchConfigured: false,
    ...overrides,
  });
}

describe("Login page", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders the demo sign-in option", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /try the demo/i })).toBeInTheDocument();
  });

  it("disables Continue with Twitch when Twitch OAuth isn't configured", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /continue with twitch/i })).toBeDisabled();
    expect(screen.getByText(/needs TWITCH_CLIENT_ID/)).toBeInTheDocument();
  });

  it("enables Continue with Twitch once the server reports it's configured", () => {
    resetStore({ twitchConfigured: true });
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /continue with twitch/i })).toBeEnabled();
  });

  it("calls loginDemo when Try the demo is clicked", async () => {
    const loginDemo = vi.fn().mockResolvedValue(undefined);
    resetStore({ loginDemo } as Partial<ReturnType<typeof useAuthStore.getState>>);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /try the demo/i }));
    expect(loginDemo).toHaveBeenCalledOnce();
  });

  it("redirects away from /login once authenticated", () => {
    resetStore({ status: "authenticated", user: { id: "1", username: "demo_streamer", displayName: "Demo Streamer", profileImageUrl: null, isDemo: true, role: "USER" } });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>,
    );
    // Redirected away — the login form itself should no longer be present.
    expect(screen.queryByRole("button", { name: /try the demo/i })).not.toBeInTheDocument();
  });
});
