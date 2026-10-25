import dns from "node:dns";
import process from "node:process";
import { fixtureFetch, loadFixture } from "./fixture-fetch.ts";

// The `pnpm add-plugin`, `pnpm build`, and `pnpm discover` tests load this file with NODE_OPTIONS=--import, so the
// command reads the recorded fixture named by ZPI_FIXTURE instead of the network. Each host
// resolves to one public address, so the host check needs no DNS.
const path = process.env.ZPI_FIXTURE;
if (path) {
  globalThis.fetch = fixtureFetch(loadFixture(path).responses).fetch;
  dns.promises.lookup = (async () => [{ address: "140.82.112.3", family: 4 }]) as unknown as typeof dns.promises.lookup;
}
