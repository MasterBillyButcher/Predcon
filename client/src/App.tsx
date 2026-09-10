import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/callback/twitch" element={<TwitchCallback />} />
        <Route path="/overlay/:id" element={<Overlay />} />

        {/* Authenticated app shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Landing />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/predict/create" element={<PredictCreate />} />
          <Route path="/predict/active" element={<PredictActive />} />
          <Route path="/predict/history" element={<PredictHistory />} />
          <Route path="/predict/:id" element={<PredictDetail />} />
          <Route path="/predict/:id/edit" element={<PredictEdit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
