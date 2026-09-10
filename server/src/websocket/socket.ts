import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { eventBus, type DomainEvent } from "../lib/eventBus.js";

export function attachWebsocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL ?? "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Clients join a room per prediction id right after connecting so
    // updates only fan out to viewers of that specific prediction
    // (dashboard, detail page, and overlay all subscribe this way).
    socket.on("subscribe", (predictionId: string) => {
      if (typeof predictionId === "string" && predictionId.length > 0) {
        socket.join(`prediction:${predictionId}`);
      }
    });
    socket.on("unsubscribe", (predictionId: string) => {
      if (typeof predictionId === "string") {
        socket.leave(`prediction:${predictionId}`);
      }
    });
  });

  eventBus.on("domain-event", (event: DomainEvent) => {
    io.to(`prediction:${event.predictionId}`).emit(event.type, {
      predictionId: event.predictionId,
      payload: event.payload,
      serverNow: new Date().toISOString(),
    });
  });

  return io;
}
