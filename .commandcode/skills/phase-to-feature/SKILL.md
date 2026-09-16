---
name: phase-to-feature
description: Generate a feature spec file for a given phase number from context/phases.md. Validates that all prior phases are complete (via git tags) before allowing the spec to be written.
argument-hint: <phase-number>
---

# Phase Feature Spec Generator

Generates a feature spec file in `@context/features/` for a single development
phase from `@context/phases.md`. A phase is treated as a feature: the spec
file captures the phase's goal, tasks, and done-when criteria so the work can
be picked up and tracked via the existing `feature` skill workflow.

## When to use

Invoke this skill when you want to start the next unit of work in the phased
build plan (see `context/phases.md`). It produces the input that the
`feature` skill (load/start/review/complete) operates on.

## Argument

A single integer: the phase number to start (e.g. `0`, `2`, `7`).

If no argument is given, or it isn't a non-negative integer, explain the
expected usage and stop.

## Workflow

1. **Parse the phase number** from `$ARGUMENTS`. Validate it's a non-negative
   integer.

2. **Read `@context/phases.md`** and locate the section whose heading is
   `## Phase N — <title>` (matching the requested number). Extract:
   - The phase title (after the em dash)
   - The **Goal** paragraph(s)
   - The bullet list under **Tasks**
   - The bullet list under **Done when** (treat these as the testable
     acceptance criteria)

   If no matching phase section exists, stop with an error listing the valid
   phase numbers found in the file.

3. **Validate prior-phase completion.** For each phase number `0` through
   `N-1`, the corresponding git tag `phase-N-complete` (per
   `context/git-conventions.md`) must exist on the current repository:
   - If any prior phase is missing its tag, stop with a clear message:
     `Phase {X} is not marked complete (missing tag phase-X-complete).`
     List every missing prior phase so the user can see the full gap.
   - **Exception — Phase 0:** if no git repository exists yet (`.git`
     absent), treat Phase 0 as the implicit starting point and skip the tag
     check. This matches the project's intent that Phase 0 is the scaffold
     commit that initializes git (see `git-conventions.md` → "Repository
     setup").

4. **Derive a kebab-case slug** from the phase title. Lowercase, replace
   any run of non-alphanumeric characters with a single hyphen, trim
   leading/trailing hyphens. Example: `Data layer in mock mode` →
   `data-layer-in-mock-mode`.

5. **Generate the spec file** at
   `@context/features/phase-{N}-{slug}-spec.md`.

   Use **exactly** the structure defined in
   `@context/docs/plans/how-feature-spec-made.md`:

   ```markdown
   # Phase N — {title}

   ## Overview

   {Goal paragraph(s) from phases.md, condensed to 2–4 sentences.}

   ## Requirements

   {Each task from phases.md becomes a bullet, prefixed with `- `.}
   {Each "Done when" bullet becomes a separate bullet under a sub-list,
   framed as an acceptance criterion.}

   ## Note

   {Open questions, assumptions, edge cases. Include at minimum:

   - Reference to the five business rules in AGENTS.md (any phase touching
     session/order data must preserve them).
   - The expected git workflow for this phase (branch name
     `phase-N-{slug}`, tag `phase-N-complete` on merge).
   - Any phase-specific caveats surfaced from the surrounding docs.}

   ## References

   - {Any phase-specific references that are obviously relevant}
   ```

6. **Report** what was created and the next step for the user: load this
   spec into `@context/current-feature.md` via the existing `feature load`
   skill to start the implementation.

## Stop conditions

Stop and surface a clear error (do **not** silently create a spec) when:

- The phase number argument is missing or not a non-negative integer.
- No matching `## Phase N — ...` section exists in `phases.md`.
- One or more prior phases are missing their `phase-X-complete` tag.
- The target spec file already exists (refuse to overwrite — tell the user
  to delete or rename the existing file first).

## Output

On success, end with a single line:

```
Created @context/features/phase-{N}-{slug}-spec.md — load it with: /feature load
```
