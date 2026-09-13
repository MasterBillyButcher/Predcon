import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return socket;
}

const PREDICTION_EVENTS = [
  "prediction.created",
  "prediction.started",
  "prediction.updated",
  "prediction.joined",
  "prediction.locked",
  "prediction.resolving",
  "prediction.resolved",
  "prediction.cancelled",
  "prediction.expired",
  "countdown.updated",
  "leaderboard.updated",
] as const;

/**
 * Subscribes to realtime updates for a single prediction. `onEvent` fires
 * for every domain event in the room; callers typically just refetch the
 * prediction rather than trying to hand-merge each event's partial payload,
 * which sidesteps ordering/duplicate-event edge cases entirely.
 */
export function usePredictionSocket(predictionId: string | null | undefined, onEvent: () => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!predictionId) return;
    const s = getSocket();
    s.emit("subscribe", predictionId);

    const handler = () => onEventRef.current();
    PREDICTION_EVENTS.forEach((evt) => s.on(evt, handler));
    s.on("connect", handler); // pick up any state missed while disconnected

    return () => {
      PREDICTION_EVENTS.forEach((evt) => s.off(evt, handler));
      s.off("connect", handler);
      s.emit("unsubscribe", predictionId);
    };
  }, [predictionId]);
}
