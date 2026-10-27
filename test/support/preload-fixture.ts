import dns from "node:dns";
import { appendFileSync } from "node:fs";
import process from "node:process";
import { fixtureFetch, loadFixture } from "./fixture-fetch.ts";

// The `pnpm add-plugin`, `pnpm build`, `pnpm close-issue`, `pnpm discover`, `pnpm discover-issue`, `pnpm propose`, and `pnpm report-issue` tests load this file with NODE_OPTIONS=--import, so the
// command reads the recorded fixture named by ZPI_FIXTURE instead of the network. Each host
// resolves to one public address, so the host check needs no DNS. With ZPI_REQUESTS, each
// request's method, URL, and body is appended to that file as one line of JSON.
const path = process.env.ZPI_FIXTURE;
const log = process.env.ZPI_REQUESTS;
if (path) {
  const record = log
    ? ({ method, url, body }: { method: string; url: string; body?: string }) =>
        appendFileSync(log, `${JSON.stringify({ method, url, body })}\n`)
    : undefined;
  globalThis.fetch = fixtureFetch(loadFixture(path).responses, record).fetch;
  dns.promises.lookup = (async () => [{ address: "140.82.112.3", family: 4 }]) as unknown as typeof dns.promises.lookup;
}
