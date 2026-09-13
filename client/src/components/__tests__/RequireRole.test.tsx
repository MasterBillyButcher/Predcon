import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequireRole } from "../RequireRole";
import { useAuthStore } from "../../store/authStore";

function setAuth(status: "loading" | "authenticated" | "unauthenticated", role?: "USER" | "ADMIN" | "SUPER_ADMIN") {
  useAuthStore.setState({
    status,
    user: role ? { id: "u1", username: "x", displayName: "X", profileImageUrl: null, isDemo: false, role } : null,
  } as Partial<ReturnType<typeof useAuthStore.getState>>);
}

function renderGated(roles: Array<"USER" | "ADMIN" | "SUPER_ADMIN">) {
  return render(
    <MemoryRouter>
      <RequireRole roles={roles}>
        <div>Protected content</div>
      </RequireRole>
    </MemoryRouter>,
  );
}

describe("RequireRole", () => {
  beforeEach(() => setAuth("unauthenticated"));

  it("shows a loading state while auth is still resolving", () => {
    setAuth("loading");
    renderGated(["ADMIN"]);
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("prompts sign-in for a logged-out visitor", () => {
    setAuth("unauthenticated");
    renderGated(["ADMIN"]);
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("shows an Admins-only message for a signed-in user with the wrong role", () => {
    setAuth("authenticated", "USER");
    renderGated(["ADMIN", "SUPER_ADMIN"]);
    expect(screen.getByText("Admins only")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected content for an allowed role", () => {
    setAuth("authenticated", "ADMIN");
    renderGated(["ADMIN", "SUPER_ADMIN"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders for Super Admin too when listed", () => {
    setAuth("authenticated", "SUPER_ADMIN");
    renderGated(["ADMIN", "SUPER_ADMIN"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
