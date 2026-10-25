# M010: Take one repo URL from an issue form

- **Status:** planned
- **Priority:** normal
- **Depends on:** M009
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — a public issue form that anyone can use to propose a plugin
- **Branch/PR:** —

## Goal

An issue form takes one GitHub repo URL, and a workflow drafts that repo's entry and opens a pull request, or replies on the issue with the reason it cannot.

## Scope

**In:** `.github/ISSUE_TEMPLATE/add-plugin.yml`, a form with one required URL field that adds the label
`add-plugin`. `.github/workflows/add-plugin-issue.yml`, which runs on `issues: opened` when that label is set and
passes the issue body to the script through an environment variable only. A script in `src/discover/` that
reads the URL from the form body, applies M009's skip rules and the index check, reads the repo, and opens one
pull request through M009's propose step with `Closes #<issue>` in its body. It comments on the issue with the
pull request URL, or with the reason it opened none, and closes the issue when it opened none. README text and
an edit to M009's CHANGELOG entry.

**Out:** Works and Broken user reports → candidate row "Collect works and broken user reports".

## Acceptance criteria

- [ ] AC1: The form-body parser returns the first non-empty line, trimmed, under the URL field's heading in
      a body GitHub renders from `add-plugin.yml`, and it returns a named problem when that line is
      `_No response_` or the heading is absent. A test covers a rendered body, the same body with CRLF line
      endings, a `_No response_` body, and a body with no such heading. The reader's `not-github-repo` failure
      judges whether the value is a GitHub repo URL.
- [ ] AC2: For a repo that passes the inclusion bar, the run opens one pull request whose body contains
      `Closes #<issue>` and comments the pull request URL on the issue; a test with a fake GitHub API asserts
      both requests.
- [ ] AC3: For a body the parser rejects, a read that fails, or an entry `writeEntry` refuses, the run
      comments the problem or failure name and its message, and closes the issue as not planned. When the
      push or the pull-request request fails, the run comments the error, leaves the issue open, and exits 1.
      A test with a fake GitHub API asserts the requests for a parser problem, a `not-github-repo` read, an
      `entry-exists` write, and a failed push.
- [ ] AC4: For a repo that an entry's `repoUrl` names, or whose bot pull request is open or closed without a
      merge, the run reads nothing, comments naming the entry or the pull request, and closes the issue; a
      test asserts this for each of the three cases.
- [ ] AC5: A parse of `add-plugin-issue.yml` with Ruby's YAML shows that no `run:` value contains `${{`, that
      the issue body reaches the script through an `env:` value, the `issues: opened` trigger, a job condition
      on the `add-plugin` label, the concurrency group `discover` that `discover.yml` names, and the
      permissions `contents: write`, `pull-requests: write`, and `issues: write` and no other.
- [ ] AC6: README describes the form, and M009's CHANGELOG entry names it; `pnpm test` and `pnpm check` pass.
- [ ] AC7: After the merge, one issue opened from the form for a repo that has no entry and no bot pull
      request gets the comment that AC2 or AC3 names from the workflow.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3
- AC3 → T1, T3
- AC4 → T1, T3
- AC5 → T4
- AC6 → T5
- AC7 → T6

## Tasks

- [ ] T1: Write `add-plugin.yml` and failing tests for AC1–AC4, with form bodies in the shape GitHub renders.
- [ ] T2: Implement the form-body parser.
- [ ] T3: Implement the issue run on top of M009's propose step: the index and skip checks, the read, the pull
      request with `Closes #<issue>`, the comment, and the close.
- [ ] T4: Write `add-plugin-issue.yml` with the body in `env:` only and the `discover` concurrency group;
      check it with `ruby -ryaml`.
- [ ] T5: Write the README text and edit M009's CHANGELOG entry; run the verify slot.
- [ ] T6: After the merge, ask the user to open one issue from the form (or open it at their yes), and record
      the issue and run URLs in the Review section.

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: idea vet: no concern beyond the three posed at the question set for the series; the form honors the user's "skip for good" answer for closed bot pull requests, and the maintainer can still add such a repo with `pnpm add-plugin`.
- 2026-10-25: feature series: M008 -> M009 -> M010.
- 2026-10-25: plan gate chose passing the issue body through `env:` and parsing it in TypeScript over reading it in a run script with `${{ }}`, because an expression in a run script lets an issue author inject shell commands; falsified by a GitHub change that renders `env:` values into scripts.
- 2026-10-25: plan gate chose `Closes #<issue>` in the pull request body over closing the issue when the pull request opens, so the issue stays open until the entry merges; falsified by the user closing such issues by hand.
- 2026-10-25: criteria audit (full mode, fresh Opus reader) returned 5 findings, all fixed: AC1 takes the first line under the heading, plants `_No response_`, CRLF, and a missing heading, and leaves URL judgment to the reader's `not-github-repo`; AC3 now covers `writeEntry` refusals and push or request failures, so every issue gets a reason, as the Goal promises; AC5 checks parsed `run:` values for `${{` in place of a one-spelling grep, which the label condition would also have broken, and adds the `discover` concurrency group so two runs never push one branch at once; AC7 names a repo with no entry and no bot pull request, and its recording act moved to T6.
- 2026-10-25: plan gate chose to leave the issue open on a push or request failure over closing it as not planned, because that failure is the bot's and not the proposer's; falsified by such issues piling up unanswered.
- 2026-10-25: lessons used: 2026-10-25 (M006) Ruby YAML to parse a workflow; 2026-10-25 (M002) the fixture preload.

## Decisions

## Review
