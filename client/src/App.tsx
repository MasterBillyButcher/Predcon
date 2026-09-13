import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireRole } from "./components/RequireRole";
import { AppShell } from "./components/layout/AppShell";
import { ToastContainer } from "./components/ui/ToastContainer";

import { Login } from "./pages/Login";
import { TwitchCallback } from "./pages/TwitchCallback";
import { Landing } from "./pages/Landing";
import { Predict } from "./pages/Predict";
import { PredictCreate } from "./pages/PredictCreate";
import { PredictActive } from "./pages/PredictActive";
import { PredictHistory } from "./pages/PredictHistory";
import { PredictDetail } from "./pages/PredictDetail";
import { PredictEdit } from "./pages/PredictEdit";
import { Settings } from "./pages/Settings";
import { Overlay } from "./pages/Overlay";
import { NotFound } from "./pages/NotFound";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public, outside the app shell */}
        <Route path="/login" element={<Login />} />
        <Route path="/callback/twitch" element={<TwitchCallback />} />
        <Route path="/overlay/:id" element={<Overlay />} />

        {/* The shell itself is public — anyone can view predictions,
            history, and detail pages without signing in. Individual
            routes inside it are gated only where that specific action
            needs it (creating/editing needs Admin, Settings needs any
            signed-in account). */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/predict" element={<Predict />} />
          <Route
            path="/predict/create"
            element={
              <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
                <PredictCreate />
              </RequireRole>
            }
          />
          <Route path="/predict/active" element={<PredictActive />} />
          <Route path="/predict/history" element={<PredictHistory />} />
          <Route path="/predict/:id" element={<PredictDetail />} />
          <Route
            path="/predict/:id/edit"
            element={
              <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
                <PredictEdit />
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
