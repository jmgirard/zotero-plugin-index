import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The check, add-plugin, build, discover, propose, issue, and site tests start pnpm processes, and the first check
    // run may download the registry schema, which can take up to the 30-second fetch timeout.
    testTimeout: 60_000,
  },
});
