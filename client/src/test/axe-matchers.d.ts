import "vitest";
import type { AxeResults } from "jest-axe";

interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Keeps AxeResults referenced so this file counts as a module augmentation,
// not an ambient global (import "vitest" above already ensures this, but
// TS requires at least one type-only usage to avoid an unused-import flag).
export type { AxeResults };
