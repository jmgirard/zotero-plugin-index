import process from "node:process";
import { fixtureFetch, loadFixture } from "./fixture-fetch.ts";

// The `pnpm add-plugin` and `pnpm build` tests load this file with NODE_OPTIONS=--import, so the
// command reads the recorded fixture named by ZPI_FIXTURE instead of the network.
const path = process.env.ZPI_FIXTURE;
if (path) globalThis.fetch = fixtureFetch(loadFixture(path).responses).fetch;
