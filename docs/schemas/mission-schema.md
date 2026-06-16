# Mission file schema

A mission is written to `.atelier/missions/<date>-<goal-slug>.md` and is the single source
of truth for a run. It has three sections:

- `## Plan`: a numbered list of the approved steps.
- `## Tasks`: a table with columns ID, Description, Agent, Status, Deps. Status is one of
  `pending`, `in-progress`, `blocked`, `done`. Deps is a comma-separated list of task ids
  or `-`. Descriptions must not contain a pipe character.
- `## Decision log`: a bulleted list of routing and ordering decisions.

The `lib/mission.mjs` helper renders and parses this format; a round-trip preserves the
mission object.
