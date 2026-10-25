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

- 2026-10-25 (M001, used M002): pnpm is not installed on the maintainer's machine, so run it as `npx -y pnpm@12.15.0`. The check, add-plugin, and build tests spawn pnpm through `npm_execpath`, so run them with `pnpm test`, not bare `vitest`. A cold `npx` start once took minutes, which is why the test timeout is 60 s.
- 2026-10-25 (M001, used M002): pnpm runs a script from the package root, so a relative path argument resolves there, not where the user typed it. Resolve such arguments against `INIT_CWD`, and find repo files such as `.cache/` from `import.meta.dirname`.
- 2026-10-25 (M002): pnpm finds no script when its cwd is outside the package, so a test that runs pnpm from a temp dir passes `--dir <repo root>`. pnpm still sets `INIT_CWD` to the caller's cwd, so relative paths keep resolving there.
- 2026-10-25 (M002): To run a CLI against recorded responses, start pnpm with `NODE_OPTIONS=--import=<abs path>/test/support/preload-fixture.ts` and `ZPI_FIXTURE=<fixture>`; the preload replaces `globalThis.fetch`. Keep a failing-fixture test beside the passing one, since a passing CLI test also passes against the live network.
- 2026-10-25 (M002): Plugin-template repos keep `update.json` in a prerelease tagged `release` with no `.xpi`, and some manifests use `__MSG_name__` with `_locales/<default_locale>/messages.json`. Read real XPIs before assuming manifest shape.
