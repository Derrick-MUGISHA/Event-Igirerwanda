import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    /* resolve the "@/*" -> "./src/*" alias from tsconfig natively (Vitest 4) */
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    /* real Atlas connections are slow to establish; give network room */
    testTimeout: 30_000,
    hookTimeout: 30_000,
    /* one worker so the shared Mongo connection isn't torn down mid-suite */
    fileParallelism: false,
  },
});
