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

- 2026-10-25 (M001): pnpm is not installed on the maintainer's machine, so run it as `npx -y pnpm@12.15.0`. The check tests spawn pnpm through `npm_execpath`, so run them with `pnpm test`, not bare `vitest`. A cold `npx` start once took minutes, which is why the test timeout is 60 s.
- 2026-10-25 (M001): pnpm runs a script from the package root, so a relative path argument resolves there, not where the user typed it. Resolve such arguments against `INIT_CWD`, and find repo files such as `.cache/` from `import.meta.dirname`.
