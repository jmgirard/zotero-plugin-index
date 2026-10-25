import dns from "node:dns";
import net from "node:net";

// Returns every address a host name resolves to.
export type Lookup = (host: string) => Promise<string[]>;

// Calls dns.promises.lookup at call time, so the CLI tests' preload can replace it.
export const systemLookup: Lookup = async (host) =>
  (await dns.promises.lookup(host, { all: true })).map((entry) => entry.address);

// Loopback, private, link-local, shared, multicast, reserved, documentation, and
// benchmark ranges, which a plugin's download URLs must not reach.
const IPV4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

// ::ffff:0:0/96 is not listed: a mapped address is checked by its IPv4 part.
const IPV6_RANGES: [string, number][] = [
  ["::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2002::", 16],
  ["2001:db8::", 32],
];

export type Refusal = { failure: "host-refused" | "request-failed"; message: string };

// Checks the host of `url` before a request. The host is the URL parser's, with
// IPv6 brackets and one trailing dot removed. A name is refused when any address
// the lookup returns is in a listed range. fetch looks the name up again when it
// connects, and that answer can differ from this one.
// The lookup gets the name as fetch will, trailing dot kept, since a resolver can treat
// `name` and `name.` differently. An answer that is not an address counts as blocked.
export async function refusal(url: URL, lookup: Lookup): Promise<Refusal | undefined> {
  const name = url.hostname.replace(/^\[(.*)\]$/, "$1");
  const host = name.replace(/\.$/, "");
  if (net.isIP(host)) {
    return isBlocked(host) ? refused(url, `${host} is not a public address`) : undefined;
  }
  if (host === "localhost" || host.endsWith(".localhost")) return refused(url, `${host} is a loopback name`);
  let addresses: string[];
  try {
    addresses = await withTimeout(lookup(name), LOOKUP_TIMEOUT_MS);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { failure: "request-failed", message: `the lookup of ${name} for ${url.href} failed: ${reason}` };
  }
  if (addresses.length === 0) {
    return { failure: "request-failed", message: `the lookup of ${name} for ${url.href} returned no address` };
  }
  const blocked = addresses.find((address) => !net.isIP(address.replace(/%.*$/, "")) || isBlocked(address));
  return blocked !== undefined
    ? refused(url, `${name} resolves to ${JSON.stringify(blocked)}, which is not a public address`)
    : undefined;
}

// The same limit as each request's, so a hung resolver cannot stall a read.
const LOOKUP_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer after ${ms} ms`)), ms);
  });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}

function refused(url: URL, reason: string): Refusal {
  return { failure: "host-refused", message: `the reader does not request ${url.href}: ${reason}` };
}

function isBlocked(address: string): boolean {
  const v4 = ipv4(address);
  if (v4 !== undefined) return IPV4_RANGES.some(([base, bits]) => inRange(BigInt(v4), BigInt(ipv4(base)!), bits, 32));
  const v6 = ipv6(address);
  if (v6 === undefined) return false;
  if (v6 >> 32n === 0xffffn) return isBlocked(ipv4FromBits(Number(v6 & 0xffffffffn)));
  return IPV6_RANGES.some(([base, bits]) => inRange(v6, ipv6(base)!, bits, 128));
}

function inRange(address: bigint, base: bigint, bits: number, width: number): boolean {
  const shift = BigInt(width - bits);
  return address >> shift === base >> shift;
}

function ipv4(address: string): number | undefined {
  if (!net.isIPv4(address)) return undefined;
  return address.split(".").reduce((bits, part) => bits * 256 + Number(part), 0);
}

function ipv4FromBits(bits: number): string {
  return [24, 16, 8, 0].map((shift) => (bits >>> shift) & 255).join(".");
}

// Parses an IPv6 address, with a zone id dropped and a trailing dotted IPv4 part
// allowed, into its 128 bits.
function ipv6(address: string): bigint | undefined {
  const plain = address.replace(/%.*$/, "");
  if (!net.isIPv6(plain)) return undefined;
  const groups = (part: string): number[] =>
    part === ""
      ? []
      : part.split(":").flatMap((group) => {
          const v4 = ipv4(group);
          return v4 === undefined ? [Number.parseInt(group, 16)] : [v4 >>> 16, v4 & 0xffff];
        });
  const [head, tail] = plain.split("::");
  const left = groups(head);
  const right = tail === undefined ? [] : groups(tail);
  const all = [...left, ...Array(8 - left.length - right.length).fill(0), ...right];
  return all.reduce((bits: bigint, group: number) => (bits << 16n) | BigInt(group), 0n);
}
