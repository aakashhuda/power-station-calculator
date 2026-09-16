# Git Conventions

This project is built solo, phase by phase, with Claude Code. These
conventions are deliberately lightweight — no PR review process, no
multi-branch coordination — but structured enough that history stays
readable and any phase can be inspected or rolled back independently.

## Repository setup

- Initialize git in Phase 0, before any other work: `git init`, first
  commit is the bare scaffold.
- `.gitignore` must include, at minimum:
  ```
  node_modules/
  dist/
  .env
  .env.*
  !.env.example
  .astro/
  ```
- Never commit `.env`. Commit an `.env.example` instead, with the same keys
  and placeholder/empty values, so the required variables are documented
  without exposing real secrets.

## Branching model

- `main` is always deployable — every commit on `main` should be a state
  you'd be comfortable running on the VPS.
- One branch per phase from `phases.md`, named `phase-N-short-description`
  (e.g. `phase-2-data-layer`, etc).
- Merge a phase branch into `main` only once its "done when" checklist in
  `phases.md` is satisfied. Squash or regular merge both fine — pick one
  and stay consistent (squash keeps `main` history to one entry per phase,
  which is recommended given how phases.md is structured).
- Delete phase branches after merging; they're not meant to be long-lived.
- No hotfix/release-branch complexity is needed at this scale — small
  fixes after launch can go straight to a short-lived branch off `main`
  and merge back the same way.

## Commit messages

- Imperative mood: `Add close-session proration logic`, not `Added` or
  `Adds`.
- One logical change per commit. A commit that changes both a business
  rule and unrelated styling should be split into two.
- Prefix with the phase number when the commit belongs to a specific
  phase, to make `git log` scannable across the whole project:
  ```
  [phase-2] Add mock store with seeded demo session
  [phase-2] Enforce one-open-session-per-tea rule in openSession()
  [phase-5] Wire checkout to POST /api/orders per cart item
  ```
- For fixes discovered later against an already-merged phase, prefix with
  `[fix]` instead of a phase number:
  ```
  [fix] Correct courier rounding when total_order_kg is zero
  ```
- Commit body (optional, for anything non-obvious): explain _why_, not
  _what_ — the diff already shows what changed. Useful especially for any
  commit that touches one of the five business rules in
  `coding-standards.md`, so future-you knows the reasoning stuck.

## Tags

- Tag the commit on `main` at the end of each phase:
  `git tag phase-N-complete` (e.g. `phase-7-complete`).
- Tag the final production deploy commit as `v1.0.0` at the end of Phase
  10, and any subsequent production deploys with semantic-ish version
  bumps (`v1.0.1` for fixes, `v1.1.0` for a new feature added after
  launch per the "out of scope" list in `project-overview.md`).
- Push tags explicitly: `git push --tags` (not automatic with a plain
  `git push`).

## What belongs in version control vs. not

| In git                                                                                  | Not in git                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| All source under `src/`, `public/`                                                      | `node_modules/`, `dist/`                          |
| `astro.config.mjs`, `package.json`, `package-lock.json`                                 | `.env` and any real credentials                   |
| `.env.example` (placeholders only)                                                      | ------                                            |
| `project-overview.md`, `architecture.md`, `coding-standards.md`, `phases.md`, this file | Local test/scratch files, temporary debug scripts |

## Working across phases

- Start each phase on its own branch, checked out from an up-to-date
  `main`.
- Let agent commit as it completes meaningful units of work within
  a phase, rather than one giant commit at the end — this makes it easier
  to spot exactly where something broke if a phase's "done when" check
  fails.
- Before merging a phase branch, review the diff yourself (or have Claude
  Code summarize it) against that phase's task list in `phases.md` — the
  merge is the natural checkpoint to confirm nothing outside that phase's
  scope crept in.
- If a phase reveals that an earlier phase needs a change (e.g. Phase 8
  finds a mock-mode bug), fix it with a `[fix]` commit on the current
  phase branch rather than reopening the old phase branch — the earlier
  phase's tag stays as a historical marker of what was true at that point.
