import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    // These integration suites share one test database, so run files sequentially.
    fileParallelism: false,
  },
});
