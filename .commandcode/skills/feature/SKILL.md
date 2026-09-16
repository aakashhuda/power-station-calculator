---
name: feature
description: Manage current feature - load/start/review/explain/complete the current feature file
argument-hint: load|start|review|explain|complete
---

# Feature Workflow

Manages the full lifecyle of a feature from spec to merge

## Working File

`@context/current-feature.md`

### File Structure

current-feature.md file has these sections:

- # Current Feature - H1 heading with feature name when active
- ## Status - Not Started/In Progress/Complete
- ## Goals - Bullet points of what success looks like
- ## References (Optional) - External/Internal helper documents to build a feature
- ## Notes - Additional context, constraints or details from spec
- ## History - Completed features (append only)

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `load`     | Load a feature spec to current-feature.md                                       |
| `start`    | Implement the current feature in a new branch                                   |
| `review`   | Checks the goals met, code quality                                              |
| `explain`  | Document what changed and why                                                   |
| `complete` | Add and commits, merge the branch, status completed & add history (append only) |

See [actions](./actions/) for detail instructions

if no action is provided, explain the available options
