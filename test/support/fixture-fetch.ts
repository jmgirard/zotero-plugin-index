import { readFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";

// One recorded response. `xpi` maps file names in the zip to their contents; an object
// is written as JSON. `error` makes the request reject, as a network failure does, and
// `bodyError` makes reading the body reject, as a connection reset does. `unexpected`
// answers with an object that throws on any read, which the reader does not expect.
// `chunks` serves `count` chunks of `size` zero bytes, one for each read of the body.
// `base64` serves the bytes it encodes.
export interface Recorded {
  status?: number;
  headers?: Record<string, string>;
  json?: unknown;
  text?: string;
  xpi?: Record<string, unknown>;
  chunks?: { size: number; count: number };
  base64?: string;
  error?: string;
  bodyError?: string;
  unexpected?: string;
}

// Keyed by URL for GET requests. A request with another method is answered from
// `<METHOD> <url> #<n>` for its nth request with that method and URL, else from
// `<METHOD> <url>`.
export type Responses = Record<string, Recorded>;

export interface Fixture {
  source: string;
  repoUrl: string;
  responses: Responses;
}

export interface SeenRequest {
  method: string;
  url: string;
  headers: Headers;
  body?: string;
  redirect?: RequestRedirect;
  // The bytes a `chunks` body has handed to the reader so far.
  bytesEnqueued: number;
}

export function loadFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8"));
}

// A fetch that answers from `responses` by the keys above and records each request.
// `onRequest` sees each request as it is made.
export function fixtureFetch(responses: Responses, onRequest?: (seen: SeenRequest) => void) {
  const requests: SeenRequest[] = [];
  async function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = String(input);
    const method = init?.method ?? "GET";
    const sent = typeof init?.body === "string" ? init.body : undefined;
    const seen: SeenRequest = { method, url, headers: new Headers(init?.headers), body: sent, redirect: init?.redirect, bytesEnqueued: 0 };
    requests.push(seen);
    onRequest?.(seen);
    const nth = requests.filter((request) => request.method === method && request.url === url).length;
    const recorded = method === "GET" ? responses[url] : (responses[`${method} ${url} #${nth}`] ?? responses[`${method} ${url}`]);
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
    return new Response(body(recorded, seen), { status: recorded.status ?? 200, headers: recorded.headers });
  }
  return { fetch, requests };
}

function body(recorded: Recorded, seen: SeenRequest): BodyInit | null {
  const { chunks } = recorded;
  if (chunks) {
    let served = 0;
    return new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (served === chunks.count) return controller.close();
          served++;
          seen.bytesEnqueued += chunks.size;
          controller.enqueue(new Uint8Array(chunks.size));
        },
      },
      { highWaterMark: 0 },
    );
  }
  const { bodyError } = recorded;
  if (bodyError) return new ReadableStream({ start: (controller) => controller.error(new TypeError(bodyError)) });
  if (recorded.xpi) {
    const files = Object.entries(recorded.xpi).map(([name, content]) => [
      name,
      strToU8(typeof content === "string" ? content : JSON.stringify(content)),
    ]);
    return new Blob([zipSync(Object.fromEntries(files)) as Uint8Array<ArrayBuffer>]);
  }
  if (recorded.base64 !== undefined) return new Blob([Buffer.from(recorded.base64, "base64")]);
  if (recorded.text !== undefined) return recorded.text;
  if (recorded.json !== undefined) return JSON.stringify(recorded.json);
  return null;
}
