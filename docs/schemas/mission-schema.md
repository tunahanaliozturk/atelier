# Mission file schema

A mission is written to `.atelier/missions/<date>-<goal-slug>.md` and is the single source
of truth for a run. It has three sections:

- `## Plan`: a numbered list of the approved steps.
- `## Tasks`: a table with columns ID, Description, Agent, Status, Deps. Status is one of
  `pending`, `in-progress`, `blocked`, `done`. Deps is a comma-separated list of task ids
  or `-`. Descriptions must not contain a pipe character.
- `## Decision log`: a bulleted list of routing and ordering decisions.
- `## Metrics` (optional): a table with columns ID, Agent, Tokens, Duration. One row per
  completed task, recorded by the lead when the task is marked `done`. Tokens and Duration
  (minutes) are integer estimates; a blank cell parses as unknown. `/report` reads this
  section; missions without it are valid and parse with an empty metrics list.

The `lib/mission.mjs` helper renders and parses this format; a round-trip preserves the
mission object.

The `validateMission` helper in `lib/mission.mjs` enforces the invariants: every status is
one of `pending`, `in-progress`, `blocked`, `done`; every dependency references a known task
id; task ids are unique; and the dependency graph has no cycle. Use `setTaskStatus` to change
a task's status so the value stays valid.
