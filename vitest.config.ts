import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The check and add-plugin tests start pnpm processes, and the first one may
    // download the registry schema, which can take up to the 30-second fetch timeout.
    testTimeout: 60_000,
  },
});
