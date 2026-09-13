import { describe, expect, it } from "vitest";
import { assertTransition, isOpenForEntries, isTerminal } from "../src/lib/stateMachine.js";
import { ApiException } from "../src/lib/apiResponse.js";

describe("prediction state machine", () => {
  it("allows the documented lifecycle path", () => {
    expect(() => assertTransition("DRAFT", "ACTIVE")).not.toThrow();
    expect(() => assertTransition("ACTIVE", "LOCKED")).not.toThrow();
    expect(() => assertTransition("LOCKED", "RESOLVING")).not.toThrow();
    expect(() => assertTransition("RESOLVING", "RESOLVED")).not.toThrow();
  });

  it("allows cancellation from open states", () => {
    expect(() => assertTransition("DRAFT", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("ACTIVE", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("LOCKED", "CANCELLED")).not.toThrow();
  });

  it("allows expiry from ACTIVE and LOCKED", () => {
    expect(() => assertTransition("ACTIVE", "EXPIRED")).not.toThrow();
    expect(() => assertTransition("LOCKED", "EXPIRED")).not.toThrow();
  });

  it("rejects illegal transitions", () => {
    expect(() => assertTransition("DRAFT", "LOCKED")).toThrow(ApiException);
    expect(() => assertTransition("RESOLVED", "ACTIVE")).toThrow(ApiException);
    expect(() => assertTransition("CANCELLED", "ACTIVE")).toThrow(ApiException);
  });

  it("rejects skipping straight to resolved", () => {
    expect(() => assertTransition("ACTIVE", "RESOLVED")).toThrow(ApiException);
  });

  it("only ACTIVE is open for entries", () => {
    expect(isOpenForEntries("ACTIVE")).toBe(true);
    expect(isOpenForEntries("LOCKED")).toBe(false);
    expect(isOpenForEntries("DRAFT")).toBe(false);
  });

  it("identifies terminal states", () => {
    expect(isTerminal("RESOLVED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("EXPIRED")).toBe(true);
    expect(isTerminal("ACTIVE")).toBe(false);
  });
});
