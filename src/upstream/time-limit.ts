// The longest one plugin read may take, in `pnpm build` and in the discovery bot's reads.
export const READ_LIMIT_MS = 3 * 60 * 1000;

// "3 minutes" for whole minutes, else milliseconds.
export function duration(ms: number): string {
  return ms % 60_000 === 0 ? `${ms / 60_000} minute${ms === 60_000 ? "" : "s"}` : `${ms} ms`;
}

// Runs `read` with a signal that aborts once `ms` has passed, with a reason that names the
// limit. readUpstream fails a read whose signal aborts as request-failed, marked build-level.
export async function withinLimit<T>(ms: number, read: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const limit = new AbortController();
  const timer = setTimeout(() => limit.abort(new Error(`the read passed its time limit of ${duration(ms)}`)), ms);
  try {
    return await read(limit.signal);
  } finally {
    clearTimeout(timer);
  }
}
