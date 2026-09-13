import { vi } from "vitest";

/**
 * Lightweight fetch mock for component tests: maps "METHOD /api/path" to a
 * canned JSON response, so components exercise their real fetch/render
 * cycle without hitting a live server.
 */
export function mockApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const key = `${method} ${path}`;
    const matchKey = Object.keys(routes).find((k) => k === key || path.startsWith(k.split(" ")[1]));
    const data = matchKey ? routes[matchKey] : null;

    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data, error: null }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
