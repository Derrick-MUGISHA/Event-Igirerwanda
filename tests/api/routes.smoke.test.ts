import { describe, it, expect } from "vitest";

/* Smoke test for the whole API surface: import every route module and assert
   it loads without throwing and exports at least one valid HTTP handler.
   This catches import-time breakage — a bad import, a module-scope throw, a
   route file that exports nothing — across all ~50 endpoints at once, which
   is exactly the "which APIs are not integrated / not working" question. */

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

/* eager glob so Vitest knows every route module at collection time
   (import.meta.glob is a Vite feature, typed via the vite/client reference) */
const routeModules = import.meta.glob("../../src/app/api/**/route.ts");

const entries = Object.entries(routeModules).map(([path, load]) => {
  /* turn ".../api/admin/events/[id]/route.ts" into "/api/admin/events/[id]" */
  const url = path.replace(/^.*\/src\/app/, "").replace(/\/route\.ts$/, "");
  return { url, load };
});

describe("API route modules", () => {
  it("discovers the full route surface", () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  describe.each(entries)("$url", ({ load }) => {
    it("loads and exports valid HTTP handlers", async () => {
      const mod = (await load()) as Record<string, unknown>;
      const handlers = HTTP_METHODS.filter((m) => typeof mod[m] === "function");
      expect(handlers.length).toBeGreaterThan(0);
      for (const m of handlers) {
        expect(mod[m]).toBeTypeOf("function");
      }
    });
  });
});
