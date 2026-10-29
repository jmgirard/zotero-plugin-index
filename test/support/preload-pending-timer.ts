import { join } from "node:path";
import process from "node:process";

// The `pnpm build` exit tests load this file with NODE_OPTIONS=--import after the fixture
// preload. In the build command's process, it starts a 10-minute timer that nothing ends,
// as a host lookup that a time limit cut can keep running. pnpm loads it too, so the
// timer starts only in the process that runs src/build/cli.ts.
if (process.argv[1]?.endsWith(join("src", "build", "cli.ts"))) setTimeout(() => {}, 10 * 60 * 1000);
