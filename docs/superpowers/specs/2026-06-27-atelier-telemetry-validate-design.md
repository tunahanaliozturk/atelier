# Atelier — Telemetry/`/report` + `/validate` — Design

**Date:** 2026-06-27
**Status:** Approved
**Release:** cut as `0.3.0` (manifests currently say `0.2.0`).

## Purpose

Make Atelier (the agent-orchestration Claude Code plugin) more transparent and safer to run,
in one release with two features the user approved together:

- **Telemetry + `/report`** — per-mission cost accounting (tokens, duration, per-agent
  breakdown). Atelier currently has zero visibility into what a run cost.
- **`/validate`** — a pre-dispatch audit of a mission against the registry (consistency,
  agent existence, coverage gaps), reported as advisory findings that never block.

Atelier is *instructions plus small tested JS helpers*; new behavior follows that pattern —
pure, unit-tested `.mjs` helpers under `lib/` with thin Markdown commands on top.

## Current state (context)

- `lib/` helpers are pure and unit-tested via `node --test`: `frontmatter`, `mission`
  (render/parse/validate + cycle detection + `setTaskStatus`), `registry`, `routing`,
  `schedule` (`readyTasks`, `missionProgress`), `coverage` (`coverageReport`, `stackLayers`),
  `board` (`progressBar`, `missionMermaid`).
- 10 agents, 6 commands (`/orchestrate`, `/plan`, `/status`, `/crew`, `/resume`, `/retry`),
  7 skills, a SessionStart hook.
- Atelier has **no execution runtime**: it emits instructions; the lead dispatches and the
  agents do the work. Any telemetry must therefore be *recorded* during a run, not captured
  automatically.
- Mission file is the single source of truth: Markdown sections (`## Plan`, `## Tasks`,
  `## Decision log`) parsed/rendered by `lib/mission.mjs`. Statuses are
  `pending | in-progress | blocked | done`. Task descriptions must not contain `|`.

## Feature A — Telemetry + `/report`

### Data source: the lead records it

Atelier has no runtime, so the lead writes telemetry into the mission file. When a task is
marked `done`, the lead appends one row to a new `## Metrics` section with its best estimate
of tokens and duration. Accuracy is bounded by what the lead reports; this is accepted.

### Mission schema extension — `## Metrics`

A new **optional** section, same table style as `## Tasks`:

```
## Metrics

| ID | Agent | Tokens | Duration |
| --- | --- | --- | --- |
| t1 | backend-engineer | 12000 | 5 |
| t2 | backend-engineer | 8000 | 3 |
```

- `ID` — the task id (matches a row in `## Tasks`).
- `Agent` — the agent that ran it.
- `Tokens` — integer estimate of total tokens.
- `Duration` — integer minutes.

`lib/mission.mjs` round-trips a `metrics` array on the mission object:
`metrics: [{ id, agent, tokens, duration }]`. `parseMission` returns `metrics: []` when the
section is absent (**backward compatible** with all existing 0.2 missions). `renderMission`
omits the section when `metrics` is empty, so unchanged missions round-trip byte-identically.
`tokens`/`duration` parse as integers; a blank or non-numeric cell parses to `null` and the
report treats it as unknown.

### `lib/metrics.mjs` (pure, `lib/metrics.test.mjs`)

- `metricsReport(mission)` →
  ```
  {
    totalTokens,      // sum of numeric tokens across metrics rows
    totalDuration,    // sum of numeric durations (minutes)
    byAgent: {        // keyed by agent name; insertion order sorted by tokens desc
      <agent>: { tasks, tokens, duration }
    },
    costliest: { id, agent, tokens } | null,   // row with max tokens, or null if none
    recorded,         // number of metrics rows
    missing: [ id… ]  // ids of tasks with status 'done' that have no metrics row
  }
  ```
  Never throws on a well-formed mission. Rows whose `tokens`/`duration` are `null` contribute
  0 to sums and to `byAgent` totals but still count toward `recorded` and may still be the
  `costliest` only if some row has a numeric value (a metrics set with all-null tokens yields
  `costliest: null`). `missing` is derived by comparing `## Tasks` (status `done`) against the
  ids present in `## Metrics`.

### `/report` command (`commands/report.md`)

Read the most recently modified mission under `.atelier/missions/`, parse it, compute
`metricsReport`, and render:

- a header: total tokens, total duration, and `recorded`/total-done tasks;
- a per-agent table sorted by tokens descending (agent, tasks, tokens, duration);
- the costliest task line (or "no metrics recorded yet");
- a "missing metrics" note listing any `done` task ids without a row.

No mission under `.atelier/missions/` → say so. Mission present but no metrics → say so
(point the user at how the lead records them).

### Lead integration

`skills/verifying-task-output/SKILL.md` gains a step: after a task is verified and marked
`done`, append a `## Metrics` row (`id`, `agent`, estimated `tokens`, estimated `duration`).
Document the `## Metrics` section in `docs/schemas/mission-schema.md`.

## Feature B — `/validate`

### `lib/validate.mjs` (pure, `lib/validate.test.mjs`)

- `validateAgainstRegistry(mission, registry)` → `[{ level, message }]`, **never throws**.
  Findings, in this order:
  - **error** — mission consistency: duplicate task id; invalid status; dependency on an
    unknown task id; dependency cycle.
  - **error** — referential: a task's `agent` is not a registered agent name.
  - **warning** — coverage: each stack layer with zero agents (from `coverageReport(registry).gaps`).
  Returns `[]` when everything is clean.

### Sharing cycle detection (no duplication)

`lib/mission.mjs` currently has a private `detectCycle` that throws. Extract a non-throwing
`findCycle(tasks)` that returns the offending path (array of ids) or `null`, and export it.
`validateMission` keeps its throwing behavior by calling `findCycle` and throwing when it
returns a path; `validateAgainstRegistry` calls `findCycle` and emits a finding instead. One
implementation, two callers.

### `/validate` command (`commands/validate.md`)

Read the most recently modified mission + the registry, run `validateAgainstRegistry`, and
list findings grouped as errors then warnings, with a summary line ("N errors, M warnings" or
"all checks passed"). **Advisory only — it never blocks dispatch.** No mission → say so.

### Honest limitation

The `## Tasks` table records no per-task `task_kind` (columns are ID/Description/Agent/Status/
Deps), so `/validate` cannot check whether an assigned agent's `task_kinds`/`layer` fit a
specific task. It verifies the agent **exists** and surfaces registry **gaps**. Adding a
`task_kind` column to enable that deeper check is a separate, later change (out of scope).

## Architecture / data flow

```
mission file ──parseMission──► mission object { goal, plan, tasks, log, metrics }
   metrics.metricsReport ─────► /report
   validate.validateAgainstRegistry(mission, registry) ─► /validate
registry ──readRegistry──► agents
   coverage.coverageReport ──► validate gaps (warnings)
mission.findCycle ─────────────► validateMission (throws) + validate (finding)
```

All new helpers are pure functions over already-parsed structures. Commands stay thin:
read/parse, call helpers, render.

## Error handling

- `metricsReport` / `validateAgainstRegistry` never throw on a well-formed mission; malformed
  structural input is `validateMission`'s job.
- `parseMission` tolerates a missing `## Metrics` section (`metrics: []`) and non-numeric
  token/duration cells (`null`).
- `renderMission` omits an empty `## Metrics` section so existing missions round-trip
  unchanged.

## Changed / new files

- New: `lib/metrics.mjs`, `lib/metrics.test.mjs`, `lib/validate.mjs`, `lib/validate.test.mjs`,
  `commands/report.md`, `commands/validate.md`.
- Changed: `lib/mission.mjs` (metrics round-trip + extract/export `findCycle`),
  `lib/mission.test.mjs` (metrics round-trip, `findCycle`, backward-compat with metric-less
  missions), `docs/schemas/mission-schema.md` (`## Metrics` section),
  `skills/verifying-task-output/SKILL.md` (record a metrics row on done),
  `README.md` (document `/report` and `/validate`), `CHANGELOG.md` (0.3.0 entry),
  `package.json` + `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`
  (version → `0.3.0`), `test/commands.test.mjs` if it enumerates command files.

## Testing

- New: `lib/metrics.test.mjs` (totals, per-agent grouping/sort, costliest, missing, null
  tokens, empty metrics), `lib/validate.test.mjs` (each error finding, gap warnings,
  all-clean, never-throws on a cyclic mission).
- Updated: `lib/mission.test.mjs` (metrics round-trip, byte-identical round-trip for a
  metric-less mission, `findCycle` returns path/null).
- Whole suite green via `node --test`; CI runs it on Node 18/20/22.

## Out of scope (YAGNI)

- Automatic/hook-based token capture — the lead records metrics manually.
- A `task_kind` column on `## Tasks` and the deeper routing-fitness check that depends on it.
- Charts/trends for `/report`; multi-mission comparison or history.
- Making `/validate` block dispatch or return a non-zero exit code.

## Success criteria

- `node --test` green (including new helper tests) locally and in CI on Node 18/20/22.
- Versions consistent at `0.3.0` across the three manifests; CHANGELOG released.
- `/report` reads a mission's `## Metrics` and renders totals, per-agent breakdown, costliest
  task, and missing-metrics notes; absent mission/metrics handled.
- `/validate` reports consistency errors, unknown-agent errors, and coverage-gap warnings as
  advisory findings, never throwing and never blocking.
- Existing 0.2 missions (no `## Metrics`) parse and round-trip unchanged.
