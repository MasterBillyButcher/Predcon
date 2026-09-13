import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);


// Every component that subscribes to realtime updates goes through
// lib/socket.ts, which opens a real Socket.IO connection. Component tests
// render in isolation and don't need a live socket server, so the module
// is replaced here once, globally, with a no-op stub.
vi.mock("socket.io-client", () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));
