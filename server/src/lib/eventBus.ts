import { EventEmitter } from "node:events";

// Decouples predictionService (business logic) from the Socket.IO layer.
// predictionService emits domain events here; websocket/socket.ts is the
// only subscriber, and fans each event out to the right Socket.IO room.
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

export interface DomainEvent {
  type: string;
  predictionId: string;
  payload: unknown;
}

export function publish(event: DomainEvent): void {
  eventBus.emit("domain-event", event);
}
