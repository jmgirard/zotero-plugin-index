# Lessons

Durable repo lessons — build quirks, testing tricks, gotchas worth
remembering next time — captured at milestone end and surfaced at plan time.
Not status, not decisions: a lesson is a reusable "how this repo actually
behaves" note. Cross-cutting *choices* still go to `DECISIONS.md`.

One line per lesson: `- YYYY-MM-DD (M<NNN>): <lesson>`. Limits: at most 25
lessons, each at most 450 bytes. Over the limits, retire, shorten, or split
lessons first. Then the lowest-ranked lesson leaves first. Rank is the newest
milestone in a lesson's provenance, and reviews mark `used M<NNN>` on the
lessons a milestone used. Corrected in place when proven false (never append a
correction).

- 2026-10-25 (M001, used M006): pnpm is not installed on the maintainer's machine, so run it as `npx -y pnpm@12.15.0`. The check, add-plugin, and build tests spawn pnpm through `npm_execpath`, so run them with `pnpm test`, not bare `vitest`. A cold `npx` start once took minutes, which is why the test timeout is 60 s.
- 2026-10-25 (M001, used M003): pnpm runs a script from the package root, so a relative path argument resolves there, not where the user typed it. Resolve such arguments against `INIT_CWD`, and find repo files such as `.cache/` from `import.meta.dirname`.
- 2026-10-25 (M002, used M003): pnpm finds no script when its cwd is outside the package, so a test that runs pnpm from a temp dir passes `--dir <repo root>`. pnpm still sets `INIT_CWD` to the caller's cwd, so relative paths keep resolving there.
- 2026-10-25 (M002, used M006): To run a CLI against recorded responses, start pnpm with `NODE_OPTIONS=--import=<abs path>/test/support/preload-fixture.ts` and `ZPI_FIXTURE=<fixture>`; the preload replaces `globalThis.fetch`. Keep a failing-fixture test beside the passing one, since a passing CLI test also passes against the live network.
- 2026-10-25 (M002): Plugin-template repos keep `update.json` in a prerelease tagged `release` with no `.xpi`, and some manifests use `__MSG_name__` with `_locales/<default_locale>/messages.json`. Read real XPIs before assuming manifest shape.
- 2026-10-25 (M003): The reader turns every fetch rejection into `request-failed`, so a test of an error the reader does not name makes fetch resolve to an object that throws on read. `await` reads `then` on a resolved value, so a Proxy that throws on every property rejects at once; return `undefined` for `then`.
- 2026-10-25 (M003, used M006): Vitest's `beforeAll` uses `hookTimeout` (10 s by default), not `testTimeout`, so a hook that spawns pnpm passes its own timeout as the second argument.
- 2026-10-25 (M004, used M005): fflate 0.8.3 `unzipSync` inflates a deflated file into a buffer of its central-directory `originalSize` and drops the rest, but it decodes the whole stream. It returns a stored file at its compressed `size`. A size cap in the `filter` must check both `originalSize` and `size`.
- 2026-10-25 (M004, used M006): The reader's host check does DNS. Reader tests pass `{ lookup }` to `readUpstream`, a test that calls `buildData` in-process spies on `dns.promises.lookup`, and spawned CLIs get a stub from the preload. Without a stub, a test needs the network.
- 2026-10-25 (M004): Vitest fake timers fire only timers that exist when `advanceTimersByTimeAsync` runs, and real I/O such as a Blob read happens outside it. For code that sets its timer after I/O, loop `await new Promise((r) => setImmediate(r))` and an advance until the promise settles.
- 2026-10-25 (M005): fflate's `unzipSync` is synchronous, so a Vitest timeout cannot stop a test that hangs inside it. A failing-first test of a CPU-hold fix runs on until it is stopped by hand, so run it in the background and stop it with `TaskStop`.
- 2026-10-25 (M005): In a crafted zip64 test file, set only the zip64 record's total-entry field at +32. When the directory offset points at the record, fflate reads its bytes as a central-directory header, and a 0xFFFFFFFF at +24 makes `unzipSync` fail with "invalid zip data" before it loops.
- 2026-10-25 (M006): The `github-pages` environment takes deploys from `main` only. A `build.yml` dispatch on a branch checks the build job and its Pages artifact, then the deploy job fails with "not allowed to deploy to github-pages due to environment protection rules". Check the live URLs only after the merge.
- 2026-10-25 (M006): PyYAML is not installed on the maintainer's machine. To check a workflow's jobs, `if:` keys, and permissions, parse it with `ruby -ryaml -e 'YAML.load_file(".github/workflows/build.yml")'`.
