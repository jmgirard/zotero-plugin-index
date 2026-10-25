import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The check tests start a pnpm process each, and the first one may download the
    // registry schema, which can take up to the 30-second fetch timeout.
    testTimeout: 60_000,
  },
});
