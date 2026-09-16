---
name: spec-writer
description: Turn a raw feature idea (typed inline or given as a file of one or more paragraphs) into a structured feature spec .md file, grounded in this project's actual codebase conventions. This skill ONLY operates in Plan Mode — if the conversation is not currently in Plan Mode, tell the user to enable it (Shift+Tab to cycle modes, or /plan) before proceeding, and do not do the research or drafting work until they do.
argument-hint: idea-file-path-or-inline-text
---

# Spec Writer

Converts a feature idea into a project-grounded spec file, using Plan Mode's natural
research → present plan → approve → write flow.

## Hard requirement: Plan Mode only

Check whether the session is currently in Plan Mode before doing anything else.

- **Not in Plan Mode:** Stop. Tell the user this skill is designed to run in Plan Mode
  (so the spec can be reviewed before anything is written to disk) and ask them to
  switch (Shift+Tab to cycle modes, or `/plan`) and re-issue the request. Do not read
  the idea, explore the repo, or draft anything yet.
- **In Plan Mode:** Continue with the workflow below. Plan Mode already prevents file
  writes and most commands, so steps 1–3 (read-only research and drafting) are safe to
  do freely. The actual file write happens only in step 4, after the user approves the
  plan and Plan Mode is exited.

## Workflow

### Idea File Path or Inline Text

Idea or Idea file path: $ARGUMENTS

if $ARGUMENTS empty, abort and display "Error! This skill needs a idea file path or inline"

### 1. Get the idea

- If the user pasted the idea inline, use that text directly.
- If they pointed at a file, look at `filepath` or `@context/docs/ideas/{file}.md`, read it.
  It may be several paragraphs — treat the whole file as the idea, not just the
  first paragraph.
- If it's ambiguous what the "idea" even is (too short, or reads like a fragment),
  ask one clarifying question rather than guessing at scope.

### 2. Understand project context

Before drafting anything, spend real effort grounding the spec in the actual repo:

- Skim `AGENTS.md` if not done, for project context. Learn the context reading the ## Context of this project
- Identify the relevant area(s) of the codebase the feature would touch (search for
  related modules, similar existing features, naming conventions, existing patterns
  for similar functionality).
- Note the language/framework, existing architectural patterns (e.g. how similar
  features are structured — routes, services, models, tests), and any obvious
  constraints (auth patterns, existing data models, config conventions).
- Check if a `@context/docs/` directory convention already exists in the
  repo — if so, match its location and naming style. If not, default to `specs/`.
- Don't over-research. The goal is enough context to write requirements that
  reference real files, modules, or patterns — not an exhaustive audit.

### 3. Create a feature plan file

Before creating the feature spec file create a plan file of the feature idea provided

- Cover all the funtionality (not just a summary)
- What to implement
- Find out the efficient way of developing the feature within our existing architecture.
- Generate images (if needed) and add as references `@context/screenshots/ for the spec file
- If any idea is provided in the idea file then consider that
- Create the plan file `@context/docs/plans/plan-{feature-name}.md`
- Always consider the project's context while implementing

The user should be prompt after the plan file is created asking whether the user wants to proceed to create the next step after reading the plan file. (create feature spec file)

### 4. Create the feature spec file (If user wants to proceed)

Determine a short, kebab-case feature name derived from the idea file's H1 for the feature's filename (e.g. `user-notifications-spec.md`). Create the file `@context/features/{feature-name}-spec.md`

Fill out **exactly** this structure — do not add, remove, or rename sections. The purpose is to create and understand the whole feature to develop.

```markdown
# Feature Name

## Overview

2-4 sentences: what this feature is, why it's being built (the problem/value from
the idea), and the high-level approach given this project's stack and patterns.

## Requirements

- Concrete, testable requirements derived from the idea. Break multi-part ideas into
  separate bullets. Where the idea is vague on a point, make a reasonable
  implementation decision given the project's existing patterns and note it as such
  rather than leaving it open-ended.
- Include both functional requirements and any implementation-relevant specifics you
  inferred from the codebase (e.g. "extends the existing `NotificationService`
  pattern in `@app/services/`").

## Note

- Open questions, assumptions made while filling gaps in the idea, edge cases worth
  flagging, or scope explicitly excluded. Keep this to genuinely useful caveats, not
  filler.

## References

- Paths to existing files/modules in this repo that are relevant precedent or will be
  touched, and any other(external/internal) reference material (stack element's documentation eg. tailwind, better auth, prisma). Omit external links unless the idea or repo already pointed to them.
- Include the plan file for this feature
```

Keep it tight — a spec should be scannable in under four-five minutes. Prefer concrete
detail over padding; an empty or thin section is fine if there's genuinely nothing
to say, but don't pad `Note` or `Reference` just to fill space.

If the prompt answer is negative then don't create the feature file. And the plan file wil exist.

### 5. Conculution & Suggestions

- Notify the user the skill has been exceted and completed
- Suggest the user to run the skill `/feature load <filename>`
