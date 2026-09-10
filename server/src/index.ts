import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { attachUser } from "./middleware/auth.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authPublicRouter, authProtectedRouter, meRouter } from "./routes/auth.js";
import { predictionsRouter } from "./routes/predictions.js";
import { overlayRouter } from "./routes/overlay.js";
import { attachWebsocket } from "./websocket/socket.js";
import { rearmTimersOnBoot } from "./services/predictionService.js";
import { migrate } from "./lib/db.js";

migrate();

const PORT = Number(process.env.PORT ?? 4000);
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: APP_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Generous but real rate limiting on write endpoints — predictions are
// created/joined/resolved rapidly during a live stream, so this is tuned
// for that burst pattern rather than a generic API default.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(attachUser);

app.get("/api/health", (_req, res) => res.json({ success: true, data: { status: "ok" }, error: null }));

// Session-establishing routes run before CSRF protection — there's no CSRF
// cookie yet at the point someone is logging in.
app.use("/api/auth", authPublicRouter);

app.use(csrfProtection);

app.use("/api/auth", authProtectedRouter);
app.use("/api/me", meRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/overlay", overlayRouter);

app.use("/api", notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
attachWebsocket(httpServer);

httpServer.listen(PORT, async () => {
  await rearmTimersOnBoot();
   
  console.log(`PredCon API listening on http://localhost:${PORT}`);
});
