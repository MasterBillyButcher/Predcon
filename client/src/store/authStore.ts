import { create } from "zustand";
import { api, ApiRequestError } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  demoModeEnabled: boolean;
  twitchConfigured: boolean;
  bootstrap: () => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  demoModeEnabled: true,
  twitchConfigured: false,

  bootstrap: async () => {
    set({ status: "loading" });
    try {
      const authStatus = await api.get<{ twitchConfigured: boolean; demoModeEnabled: boolean }>(
        "/auth/status",
      );
      set({ twitchConfigured: authStatus.twitchConfigured, demoModeEnabled: authStatus.demoModeEnabled });
    } catch {
      // status endpoint failing shouldn't block the rest of bootstrap
    }
    try {
      const user = await api.get<User>("/me");
      set({ user, status: "authenticated" });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        set({ user: null, status: "unauthenticated" });
      } else {
        set({ user: null, status: "unauthenticated" });
      }
    }
  },

  loginDemo: async () => {
    const user = await api.post<User>("/auth/demo-login");
    set({ user, status: "authenticated" });
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null, status: "unauthenticated" });
  },
}));
