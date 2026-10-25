import { readFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";

// One recorded response. `xpi` maps file names in the zip to their contents; an object
// is written as JSON. `error` makes the request reject, as a network failure does, and
// `bodyError` makes reading the body reject, as a connection reset does. `unexpected`
// answers with an object that throws on any read, which the reader does not expect.
export interface Recorded {
  status?: number;
  headers?: Record<string, string>;
  json?: unknown;
  text?: string;
  xpi?: Record<string, unknown>;
  error?: string;
  bodyError?: string;
  unexpected?: string;
}

export type Responses = Record<string, Recorded>;

export interface Fixture {
  source: string;
  repoUrl: string;
  responses: Responses;
}

export interface SeenRequest {
  url: string;
  headers: Headers;
}

export function loadFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8"));
}

// A fetch that answers from `responses` by exact URL and records each request.
export function fixtureFetch(responses: Responses) {
  const requests: SeenRequest[] = [];
  async function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = String(input);
    requests.push({ url, headers: new Headers(init?.headers) });
    const recorded = responses[url];
    if (!recorded) return new Response(`no recorded response for ${url}`, { status: 404 });
    if (recorded.error) throw new TypeError(recorded.error);
    const { unexpected } = recorded;
    if (unexpected) {
      // `then` stays undefined, so the promise resolves to the object rather than rejecting.
      return new Proxy({} as Response, {
        get: (_target, key) => {
          if (key === "then") return undefined;
          throw new Error(unexpected);
        },
      });
    }
    return new Response(body(recorded), { status: recorded.status ?? 200, headers: recorded.headers });
  }
  return { fetch, requests };
}

function body(recorded: Recorded): BodyInit | null {
  const { bodyError } = recorded;
  if (bodyError) return new ReadableStream({ start: (controller) => controller.error(new TypeError(bodyError)) });
  if (recorded.xpi) {
    const files = Object.entries(recorded.xpi).map(([name, content]) => [
      name,
      strToU8(typeof content === "string" ? content : JSON.stringify(content)),
    ]);
    return new Blob([zipSync(Object.fromEntries(files)) as Uint8Array<ArrayBuffer>]);
  }
  if (recorded.text !== undefined) return recorded.text;
  if (recorded.json !== undefined) return JSON.stringify(recorded.json);
  return null;
}
