import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The check tests start a pnpm process each, which can take seconds on a cold machine.
    testTimeout: 20_000,
  },
});
