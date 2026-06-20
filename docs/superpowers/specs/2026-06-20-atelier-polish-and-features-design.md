# Atelier — Polish + Scheduling/Coverage/Crew — Design

**Date:** 2026-06-20
**Status:** Approved
**Release:** cut as `0.2.0` (manifests currently say `0.1.0`; the v0.2 crew/routing/command
work plus everything in this spec ship together as the first real `0.2.0` release).

## Purpose

Make Atelier (the agent-orchestration Claude Code plugin) release-ready and more capable,
in two phases the user approved together:

- **Phase 1 — polish/release-readiness:** fix the version mismatch, remove a stray
  directory, enrich the README, and add CI.
- **Phase 2 — features:** a deterministic ready-set scheduler (`/next`), a registry
  coverage doctor (`/crew`), a richer `/status` board, and three new specialist agents.

Atelier is *instructions plus small tested JS helpers*; new behavior follows that pattern —
pure, unit-tested `.mjs` helpers under `lib/` with thin Markdown commands on top.

## Current state (context)

- `lib/` helpers are pure and unit-tested via `node --test` (47 passing): `frontmatter`,
  `mission` (render/parse/validate + cycle detection + `setTaskStatus`), `registry`
  (`readRegistry`, `formatRegistry`, `LAYERS` set), `routing` (`coarseFilter`,
  `scoreCandidate`, `route`).
- 10 agents, 6 commands (`/orchestrate`, `/plan`, `/status`, `/crew`, `/resume`,
  `/retry`), 7 skills, a SessionStart hook.
- `LAYERS = {orchestration, backend, frontend, infra, data, docs, review}`. `orchestration`
  and `review` are cross-cutting (pipeline calls them by name); the rest are stack layers
  routed by the coarse capability filter.
- Mission file is the single source of truth: a Markdown table parsed/rendered by
  `lib/mission.mjs`; statuses are `pending | in-progress | blocked | done`.

## Phase 1 — Polish

### 1. Version alignment → 0.2.0
Set `version` to `0.2.0` in `package.json`, `.claude-plugin/plugin.json`, and
`.claude-plugin/marketplace.json` (the existing manifest test asserts marketplace and
plugin versions match — keep them equal). Convert CHANGELOG `[Unreleased]` to `[0.2.0]`
dated `2026-06-20`, and append the Phase 2 additions below to that section.

### 2. Cleanup
Remove the stray, untracked, empty `c:tmpkvsync2/` directory at the repo root (an accidental
artifact). It is not tracked by git, so this is a local `rm`.

### 3. README enrichment
Add to `README.md`, preserving the existing tone:
- Status badges: CI (GitHub Actions), license (MIT), version (0.2.0).
- A **Concepts** section: capability registry, the mission file as single source of truth,
  capability routing, the approval gate.
- A **mermaid flow diagram** of the pipeline: planner → lead review → user approval →
  capability routing → specialist dispatch (parallel where deps allow) → per-task
  verification → mission file updates.
- A short **worked example**: a `/orchestrate` goal, the resulting mission table, and how
  `/status` / `/next` read it.
- Document the new `/next` command in the command list.

### 4. CI
Add `.github/workflows/ci.yml`: on push and pull_request, run `node --test` on a Node
`18.x`, `20.x`, `22.x` matrix. Reference its status badge in the README.

## Phase 2 — Features

### A. Ready-set scheduler — `lib/schedule.mjs` + `/next`

Pure helpers (unit-tested in `lib/schedule.test.mjs`):

- `readyTasks(mission)` → the tasks that can start now: `status === 'pending'` **and** every
  id in `deps` refers to a task whose `status === 'done'`. Returns the task objects in
  stable order (by `id`). A task with an unknown dep id is treated as not ready (validation
  is `mission.validateMission`'s job; `readyTasks` must not throw on it).
- `missionProgress(mission)` → `{ total, done, inProgress, blocked, pending, percent }`
  where `percent = total === 0 ? 0 : Math.round((done / total) * 100)`.

`/next` command (`commands/next.md`): read the most recently modified mission under
`.atelier/missions/`, compute `readyTasks`, and list each ready task (ID, description,
agent). If none are ready, distinguish *all done*, *all remaining blocked*, and *waiting on
unfinished deps* using `missionProgress` + the task list. No mission → say so.

### B. Registry coverage doctor — `lib/coverage.mjs` + `/crew`

Pure helper (unit-tested in `lib/coverage.test.mjs`):

- `coverageReport(registry)` → a structured report:
  ```
  {
    layers: { <layer>: { agents: [name…], taskKinds: [kind…] } },  // every populated layer
    stackLayers: [ 'backend','frontend','infra','data','docs','qa','mobile','ml' ],
    gaps: [ <stackLayer with zero agents> ],
    crossCutting: [ 'orchestration', 'review' ]
  }
  ```
  Stack layers = all `LAYERS` except `orchestration` and `review`. `taskKinds` per layer is
  the deduped union of its agents' `task_kinds`, sorted. `gaps` lists stack layers present
  in the enum with no registered agent.

`/crew` (`commands/crew.md`) updated to render the coverage report: agents grouped by layer
with their capabilities and task kinds, then a "Coverage" line and an explicit "Gaps"
line (or "no gaps"). Keep `formatRegistry` for the quick flat view.

### C. Richer `/status` board — `lib/board.mjs`

Pure helpers (unit-tested in `lib/board.test.mjs`):

- `progressBar(progress, width = 10)` → a string like `[#####-----] 50% (3/6)` from a
  `missionProgress` result.
- `missionMermaid(mission)` → a mermaid `graph TD` string: one node per task
  (`id["id: description"]`), an edge `dep --> id` for each dependency, and a `classDef` +
  per-node class by status (done/in-progress/blocked/pending) so the graph is color-coded.
  Node text escapes/strips characters that break mermaid (`"`, newlines).

`/status` (`commands/status.md`) updated to render: the goal, the progress bar, the task
table **grouped by status** (in-progress, pending, blocked, done), the ready-now list
(`readyTasks`), the mermaid dependency graph (`missionMermaid`), and recent decision-log
entries. No mission → say so.

### D. Crew expansion + layer enum

Extend the stack so the crew covers more real work:

- Add `qa`, `mobile`, `ml` to `LAYERS` in `lib/registry.mjs`; update the layer table and
  "Populated layers" note in `docs/schemas/capability-schema.md`; update
  `lib/registry.test.mjs`.
- Add three specialist agents under `agents/`:
  - `qa-engineer` — `layer: qa`, `capabilities: [testing, e2e, automation, quality]`,
    `task_kinds: [test, implement]`.
  - `mobile-engineer` — `layer: mobile`,
    `capabilities: [mobile, ios, android, react-native]`, `task_kinds: [implement, refactor]`.
  - `ml-engineer` — `layer: ml`, `capabilities: [ml, training, inference, data-science]`,
    `task_kinds: [implement, optimize]`.
  Each follows `capability-schema.md` (single-line frontmatter values; advisory `model`/`color`).
- Update any test that counts agents or asserts the layer set (`test/agents.test.mjs`,
  `test/manifest.test.mjs` if applicable). The coverage doctor (B) will now show these
  layers populated.

## Architecture / data flow

```
mission file ──parseMission──► mission object
   schedule.readyTasks ─────► /next, /status "ready now"
   schedule.missionProgress ► board.progressBar ► /status header
   board.missionMermaid ────► /status dependency graph
registry ──readRegistry──► agents
   coverage.coverageReport ► /crew grouping + gaps
```

All new helpers are pure functions over already-parsed structures (`parseMission`,
`readRegistry` outputs). Commands stay thin: parse/read, call helpers, render.

## Error handling

- `readyTasks` / `missionProgress` / `progressBar` / `missionMermaid` never throw on a
  well-formed mission; malformed input is the caller's responsibility (`validateMission`).
- `missionMermaid` strips pipe/quote/newline from node text (mission descriptions already
  forbid `|`).
- `coverageReport` tolerates an empty registry (all stack layers become gaps).

## Testing

- New: `lib/schedule.test.mjs`, `lib/coverage.test.mjs`, `lib/board.test.mjs`.
- Updated: `lib/registry.test.mjs` (new layers), `test/agents.test.mjs` /
  `test/manifest.test.mjs` (new agents / version), `test/commands.test.mjs` (new `/next`
  command file, if the suite enumerates commands).
- Whole suite green via `node --test`; CI runs it on three Node versions.

## Out of scope (YAGNI)

- An actual parallel execution runtime — Atelier emits instructions; the scheduler computes
  the ready set, the lead dispatches per its existing rules.
- Telemetry/cost accounting; persisted scheduler state; a TUI.
- More agents beyond the three above (further layers are a later release).

## Success criteria

- `node --test` green (including new helper tests) locally and in CI on Node 18/20/22.
- Versions consistent at `0.2.0` across the three manifests; CHANGELOG released.
- `/next`, enriched `/status`, and `/crew` documented and wired to the new helpers.
- Three new agents registered and surfaced by the SessionStart hook; coverage doctor shows
  no stack gaps.
- README shows badges, concepts, a flow diagram, and a worked example.
