# Design

_Architecture as it **is**, not as it will be. Future work lives in
`ROADMAP.md`; status lives there too._

## Purpose & Scope

> Seeded by `/cairn-init` on 2026-10-24 from the project description given at
> init. The repo has no source yet. Refine with `/design-interview`.

zotero-plugin-index is a community index of Zotero plugins for Zotero 7 and
later, kept in a public GitHub repository. It exists because Zotero publishes
no plugin list: its support page says an official directory is planned.

The intended design is data-first. Each plugin has a hand-written `meta.json`
that points to the plugin's `update.json`. A scheduled GitHub Action reads
those files and generates each plugin's versions, its declared Zotero
compatibility range (`strict_min_version` / `strict_max_version`), its last
release date, and whether its repository is archived. An English-first static
site is one view of that data.

Under consideration, not decided: compatibility reports from users through a
GitHub issue form, and a CI smoke test that loads each plugin in a headless
Zotero. The data layout aims to stay compatible with
`zotero-plugin-dev/zotero-plugin-registry`, so the two can merge later.

Distribution: public repository with tagged releases (`v<version>`) for the
data format and tooling. The site can deploy from the default branch between
tags.

## Function Families

_None yet: the repo has no source._

## Conventions

- Numeric results are not held to the two-independent-sources check of the
  validation doctrine. Chosen at init, 2026-10-24.

## Design Principles

_None yet. `/design-interview` elicits them. Inviolable (IP<n>) block first,
then Guiding (GP<n>); numbers are never reused._

## Architecture

_None yet: the repo has no source._

## Known issues

_None._
