# Atelier Telemetry/`/report` + `/validate` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-mission telemetry (`/report`) and a pre-dispatch audit (`/validate`) to Atelier, both as pure tested helpers under `lib/` with thin Markdown commands on top.

**Architecture:** The mission file gains an optional `## Metrics` table the lead records into. `lib/metrics.mjs` computes a report from it; `lib/validate.mjs` collects (never throws) consistency + referential + coverage findings by reusing `mission.findCycle` and `coverage.coverageReport`. Two thin commands render them. Everything is a pure function over already-parsed structures.

**Tech Stack:** Node ESM (`.mjs`), `node:test` + `node:assert/strict`, no third-party deps. Markdown commands with YAML frontmatter.

## Global Constraints

- Node version floor: helpers run on Node 18, 20, 22 (CI matrix). No new dependencies.
- Pure helpers only: new `lib/*.mjs` functions never throw on a well-formed mission and have no I/O.
- Task descriptions must never contain `|` (existing mission-table rule).
- Backward compatibility: existing 0.2 missions (no `## Metrics`) must parse and round-trip byte-identically.
- Version target across `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: `0.3.0` (plugin and marketplace versions must stay equal — `test/manifest.test.mjs` asserts it).
- Run the whole suite with `node --test` from the repo root.

---

### Task 1: Extract a non-throwing `findCycle` in `lib/mission.mjs`

**Files:**
- Modify: `lib/mission.mjs` (replace private `detectCycle` with exported `findCycle`; adjust `validateMission`)
- Test: `lib/mission.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function findCycle(tasks)` → returns an array of ids forming a cycle (the path), or `null` when acyclic. `tasks` is an array of `{ id, deps }`. Never throws. `validateMission` keeps throwing `/cycle/` as before.

- [ ] **Step 1: Write the failing tests**

Add to `lib/mission.test.mjs` (update the import on line 3 to include `findCycle`):

```js
import { renderMission, parseMission, validateMission, setTaskStatus, findCycle } from './mission.mjs';
```

Append these tests:

```js
test('findCycle returns null for an acyclic task set', () => {
  const tasks = [
    { id: 't1', deps: [] },
    { id: 't2', deps: ['t1'] },
  ];
  assert.equal(findCycle(tasks), null);
});

test('findCycle returns a path containing the cyclic ids', () => {
  const tasks = [
    { id: 't1', deps: ['t2'] },
    { id: 't2', deps: ['t1'] },
  ];
  const cycle = findCycle(tasks);
  assert.ok(Array.isArray(cycle));
  assert.ok(cycle.includes('t1') && cycle.includes('t2'));
});

test('findCycle ignores deps that reference unknown task ids', () => {
  assert.equal(findCycle([{ id: 't1', deps: ['ghost'] }]), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/mission.test.mjs`
Expected: FAIL — `findCycle` is not exported (import is `undefined`, calls throw).

- [ ] **Step 3: Implement `findCycle` and rewire `validateMission`**

In `lib/mission.mjs`, replace the `detectCycle` function (currently lines ~90-105) with:

```js
export function findCycle(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map(); // id -> 'visiting' | 'done'
  let cycle = null;
  const visit = (id, stack) => {
    if (cycle) return;
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      cycle = [...stack, id];
      return;
    }
    state.set(id, 'visiting');
    for (const d of byId.get(id).deps || []) {
      if (byId.has(d)) visit(d, [...stack, id]);
      if (cycle) return;
    }
    state.set(id, 'done');
  };
  for (const t of tasks) {
    visit(t.id, []);
    if (cycle) break;
  }
  return cycle;
}
```

In `validateMission`, replace the line `detectCycle(tasks);` with:

```js
  const cycle = findCycle(tasks);
  if (cycle) throw new Error(`dependency cycle: ${cycle.join(' -> ')}`);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/mission.test.mjs`
Expected: PASS — including the existing `validateMission detects a dependency cycle` test (still throws `/cycle/`).

- [ ] **Step 5: Commit**

```bash
git add lib/mission.mjs lib/mission.test.mjs
git commit -m "refactor: extract non-throwing findCycle from mission validation"
```

---

### Task 2: Round-trip a `## Metrics` section in `lib/mission.mjs`

**Files:**
- Modify: `lib/mission.mjs` (`renderMission`, `parseMission`)
- Test: `lib/mission.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: a mission object now carries `metrics: [{ id, agent, tokens, duration }]`. `parseMission` always returns a `metrics` array (`[]` when the section is absent). `tokens`/`duration` are integers, or `null` when the cell is blank/non-numeric. `renderMission` emits the `## Metrics` section only when `metrics` is non-empty (so metric-less missions round-trip byte-identically).

- [ ] **Step 1: Write the failing tests**

In `lib/mission.test.mjs`, add `metrics: []` to the three fixtures that are compared via `parseMission(renderMission(...))` so they keep round-tripping:
- the top-level `mission` object (lines 5-13): add `metrics: []` as a final property.
- the `m` object inside `'a task with multiple dependencies round-trips the dep list'` (lines 29-34): add `metrics: []`.
- the `m` object inside `'round-trips an in-progress status, a special-char goal, and empty sections'` (lines 39-44): add `metrics: []`.

Then append new tests:

```js
test('round-trips a mission with metrics rows', () => {
  const m = {
    goal: 'g',
    plan: [],
    tasks: [{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'done', deps: [] }],
    log: [],
    metrics: [{ id: 't1', agent: 'backend-engineer', tokens: 12000, duration: 5 }],
  };
  assert.deepEqual(parseMission(renderMission(m)), m);
});

test('a metric-less mission renders no Metrics section and parses to an empty array', () => {
  const m = { goal: 'g', plan: [], tasks: [], log: [], metrics: [] };
  const md = renderMission(m);
  assert.ok(!md.includes('## Metrics'));
  assert.deepEqual(parseMission(md).metrics, []);
});

test('parses blank or non-numeric token/duration cells as null', () => {
  const md = [
    '# Mission: g', '', '## Plan', '', '## Tasks', '',
    '| ID | Description | Agent | Status | Deps |',
    '| --- | --- | --- | --- | --- |',
    '| t1 | a | backend-engineer | done | - |', '',
    '## Decision log', '',
    '## Metrics', '',
    '| ID | Agent | Tokens | Duration |',
    '| --- | --- | --- | --- |',
    '| t1 | backend-engineer |  | n/a |', '',
  ].join('\n');
  assert.deepEqual(parseMission(md).metrics, [
    { id: 't1', agent: 'backend-engineer', tokens: null, duration: null },
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/mission.test.mjs`
Expected: FAIL — `renderMission`/`parseMission` don't handle metrics yet; the new round-trip and null-cell tests fail.

- [ ] **Step 3: Implement metrics in render and parse**

In `lib/mission.mjs`, change `renderMission`'s destructuring line to include `metrics`:

```js
  const { goal, plan = [], tasks = [], log = [], metrics = [] } = mission;
```

Then, in `renderMission`, replace the tail (from `lines.push('', '## Decision log', '');` through `return lines.join('\n');`) with:

```js
  lines.push('', '## Decision log', '');
  for (const entry of log) lines.push(`- ${entry}`);
  if (metrics.length) {
    lines.push('', '## Metrics', '', '| ID | Agent | Tokens | Duration |', '| --- | --- | --- | --- |');
    for (const m of metrics) {
      const tok = m.tokens === null || m.tokens === undefined ? '' : m.tokens;
      const dur = m.duration === null || m.duration === undefined ? '' : m.duration;
      lines.push(`| ${m.id} | ${m.agent} | ${tok} | ${dur} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
```

In `parseMission`, just before the final `return { goal, plan, tasks, log };`, add:

```js
  const num = (v) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  const metrics = section('Metrics')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*ID\s*\|/.test(l) && !/^\|\s*---/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      const [id, agent, tokens, duration] = cells;
      return { id, agent, tokens: num(tokens), duration: num(duration) };
    });
```

and change the return to:

```js
  return { goal, plan, tasks, log, metrics };
```

- [ ] **Step 4: Run the full suite to verify it passes**

Run: `node --test`
Expected: PASS — new metrics tests pass and every existing mission round-trip test still passes (fixtures now carry `metrics: []`).

- [ ] **Step 5: Commit**

```bash
git add lib/mission.mjs lib/mission.test.mjs
git commit -m "feat: round-trip an optional Metrics section in the mission file"
```

---

### Task 3: `lib/metrics.mjs` — `metricsReport`

**Files:**
- Create: `lib/metrics.mjs`
- Test: `lib/metrics.test.mjs`

**Interfaces:**
- Consumes: a parsed mission `{ tasks, metrics }` (Task 2 output).
- Produces: `export function metricsReport(mission)` → `{ totalTokens, totalDuration, byAgent: { <agent>: { tasks, tokens, duration } }, costliest: { id, agent, tokens } | null, recorded, missing: [id…] }`. `byAgent` is key-ordered by tokens descending. `null` token rows contribute 0 to sums and cannot be `costliest`. `missing` = ids of `done` tasks with no metrics row. Never throws.

- [ ] **Step 1: Write the failing tests**

Create `lib/metrics.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricsReport } from './metrics.mjs';

function mission(metrics, tasks = []) {
  return { goal: 'g', plan: [], tasks, log: [], metrics };
}

test('metricsReport sums tokens and duration', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'backend-engineer', tokens: 12000, duration: 5 },
    { id: 't2', agent: 'backend-engineer', tokens: 8000, duration: 3 },
  ]));
  assert.equal(r.totalTokens, 20000);
  assert.equal(r.totalDuration, 8);
  assert.equal(r.recorded, 2);
});

test('metricsReport groups by agent ordered by tokens desc', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'frontend-engineer', tokens: 1000, duration: 1 },
    { id: 't2', agent: 'backend-engineer', tokens: 9000, duration: 4 },
  ]));
  assert.deepEqual(Object.keys(r.byAgent), ['backend-engineer', 'frontend-engineer']);
  assert.deepEqual(r.byAgent['backend-engineer'], { tasks: 1, tokens: 9000, duration: 4 });
});

test('metricsReport reports the costliest task', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'a', tokens: 100, duration: 1 },
    { id: 't2', agent: 'b', tokens: 500, duration: 2 },
  ]));
  assert.deepEqual(r.costliest, { id: 't2', agent: 'b', tokens: 500 });
});

test('metricsReport lists done tasks with no metrics row', () => {
  const r = metricsReport(mission(
    [{ id: 't1', agent: 'a', tokens: 100, duration: 1 }],
    [
      { id: 't1', description: 'x', agent: 'a', status: 'done', deps: [] },
      { id: 't2', description: 'y', agent: 'b', status: 'done', deps: [] },
      { id: 't3', description: 'z', agent: 'c', status: 'pending', deps: [] },
    ],
  ));
  assert.deepEqual(r.missing, ['t2']);
});

test('metricsReport treats null tokens as zero and yields null costliest when all null', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'a', tokens: null, duration: null },
  ]));
  assert.equal(r.totalTokens, 0);
  assert.equal(r.totalDuration, 0);
  assert.equal(r.costliest, null);
  assert.equal(r.recorded, 1);
});

test('metricsReport on an empty metrics set is all zeros', () => {
  assert.deepEqual(metricsReport(mission([])), {
    totalTokens: 0, totalDuration: 0, byAgent: {}, costliest: null, recorded: 0, missing: [],
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/metrics.test.mjs`
Expected: FAIL — `Cannot find module './metrics.mjs'`.

- [ ] **Step 3: Implement `lib/metrics.mjs`**

Create `lib/metrics.mjs`:

```js
// Per-mission telemetry. Pure function over a parsed mission (parseMission):
// totals, a per-agent breakdown, the costliest task, and which done tasks lack a row.

export function metricsReport(mission) {
  const metrics = mission.metrics || [];
  const tasks = mission.tasks || [];

  let totalTokens = 0;
  let totalDuration = 0;
  const byAgent = {};
  let costliest = null;

  for (const m of metrics) {
    const tokens = typeof m.tokens === 'number' ? m.tokens : 0;
    const duration = typeof m.duration === 'number' ? m.duration : 0;
    totalTokens += tokens;
    totalDuration += duration;
    const entry = (byAgent[m.agent] ||= { tasks: 0, tokens: 0, duration: 0 });
    entry.tasks += 1;
    entry.tokens += tokens;
    entry.duration += duration;
    if (typeof m.tokens === 'number' && (costliest === null || m.tokens > costliest.tokens)) {
      costliest = { id: m.id, agent: m.agent, tokens: m.tokens };
    }
  }

  const byAgentSorted = {};
  for (const [agent, e] of Object.entries(byAgent).sort((a, b) => b[1].tokens - a[1].tokens)) {
    byAgentSorted[agent] = e;
  }

  const recordedIds = new Set(metrics.map((m) => m.id));
  const missing = tasks
    .filter((t) => t.status === 'done' && !recordedIds.has(t.id))
    .map((t) => t.id);

  return {
    totalTokens,
    totalDuration,
    byAgent: byAgentSorted,
    costliest,
    recorded: metrics.length,
    missing,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/metrics.test.mjs`
Expected: PASS — all six tests.

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.mjs lib/metrics.test.mjs
git commit -m "feat: add metricsReport telemetry helper"
```

---

### Task 4: `/report` command, lead recording step, schema doc

**Files:**
- Create: `commands/report.md`
- Modify: `skills/verifying-task-output/SKILL.md`, `docs/schemas/mission-schema.md`, `test/commands.test.mjs`

**Interfaces:**
- Consumes: `metricsReport` (Task 3), `parseMission` (Task 2).
- Produces: a `/report` command file; `test/commands.test.mjs` `expected` array now includes `'report'`.

- [ ] **Step 1: Add `report` to the command enumeration test**

In `test/commands.test.mjs`, change the `expected` array (line 7) to:

```js
const expected = ['orchestrate', 'plan', 'status', 'crew', 'resume', 'retry', 'next', 'report'];
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/commands.test.mjs`
Expected: FAIL — `missing commands/report.md`.

- [ ] **Step 3: Create `commands/report.md`**

```markdown
---
description: Show per-mission telemetry — total tokens and duration, a per-agent breakdown, the costliest task, and any done tasks missing metrics.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). Compute the report with `metricsReport` (`lib/metrics.mjs`).

- Header: total tokens, total duration in minutes, and how many tasks have metrics recorded
  (`recorded`) versus the number of `done` tasks.
- A per-agent table sorted by tokens descending: agent, tasks, tokens, duration.
- The costliest task (ID, agent, tokens), or note that no metrics are recorded yet when it is
  null.
- A "missing metrics" note listing any `done` task ids that have no metrics row, so the lead
  can fill them in.
- If there is no mission file, say there is no active mission. If the mission has no `## Metrics`
  rows, say so and point to how the lead records them: a row per task on completion.
```

- [ ] **Step 4: Document the recording step and schema**

In `skills/verifying-task-output/SKILL.md`, replace the final paragraph (the line beginning "Mark the task `done` only when both pass.") with:

```markdown
Mark the task `done` only when both pass. If an agent cannot resolve a blocker, mark the
task `blocked` and surface it to the user.

When you mark a task `done`, append a row to the mission's `## Metrics` section (creating the
section if it is absent) with the task id, the agent that ran it, and your best estimate of
the tokens used and the wall-clock duration in minutes. Leave a cell blank if you cannot
estimate it. `/report` reads these rows.
```

In `docs/schemas/mission-schema.md`, after the `## Decision log` bullet (line 10), add:

```markdown
- `## Metrics` (optional): a table with columns ID, Agent, Tokens, Duration. One row per
  completed task, recorded by the lead when the task is marked `done`. Tokens and Duration
  (minutes) are integer estimates; a blank cell parses as unknown. `/report` reads this
  section; missions without it are valid and parse with an empty metrics list.
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `node --test`
Expected: PASS — `commands/report.md` exists with a description and non-empty body.

- [ ] **Step 6: Commit**

```bash
git add commands/report.md skills/verifying-task-output/SKILL.md docs/schemas/mission-schema.md test/commands.test.mjs
git commit -m "feat: add /report command and document metrics recording"
```

---

### Task 5: `lib/validate.mjs` — `validateAgainstRegistry`

**Files:**
- Create: `lib/validate.mjs`
- Test: `lib/validate.test.mjs`

**Interfaces:**
- Consumes: `STATUSES` and `findCycle` from `lib/mission.mjs` (Task 1), `coverageReport` from `lib/coverage.mjs`. The registry argument is the array `readRegistry` returns (`[{ name, layer, task_kinds, … }]`).
- Produces: `export function validateAgainstRegistry(mission, agents)` → `[{ level: 'error' | 'warning', message }]`. Never throws. Errors: duplicate id, invalid status, unknown dependency, dependency cycle, unregistered agent. Warnings: coverage gaps.

- [ ] **Step 1: Write the failing tests**

Create `lib/validate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAgainstRegistry } from './validate.mjs';

const agents = [
  { name: 'backend-engineer', layer: 'backend', task_kinds: ['implement'], capabilities: [] },
  { name: 'planner', layer: 'orchestration', task_kinds: ['plan'], capabilities: [] },
];

function mission(tasks) {
  return { goal: 'g', plan: [], tasks, log: [], metrics: [] };
}

const errors = (f) => f.filter((x) => x.level === 'error').map((x) => x.message);
const warnings = (f) => f.filter((x) => x.level === 'warning').map((x) => x.message);

test('a consistent mission with known agents has no errors', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: [] }]),
    agents,
  );
  assert.deepEqual(errors(f), []);
});

test('flags a task whose agent is not registered', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'ghost', status: 'pending', deps: [] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /agent "ghost"/.test(m)));
});

test('flags an unknown dependency', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: ['t9'] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /not a known task id/.test(m)));
});

test('flags an invalid status', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'wip', deps: [] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /invalid status/.test(m)));
});

test('never throws on a cyclic mission and reports the cycle', () => {
  const f = validateAgainstRegistry(
    mission([
      { id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: ['t2'] },
      { id: 't2', description: 'b', agent: 'backend-engineer', status: 'pending', deps: ['t1'] },
    ]),
    agents,
  );
  assert.ok(errors(f).some((m) => /cycle/.test(m)));
});

test('warns about coverage gaps', () => {
  const f = validateAgainstRegistry(mission([]), agents);
  assert.ok(warnings(f).some((m) => /frontend/.test(m)));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/validate.test.mjs`
Expected: FAIL — `Cannot find module './validate.mjs'`.

- [ ] **Step 3: Implement `lib/validate.mjs`**

Create `lib/validate.mjs`:

```js
// Pre-dispatch audit. Pure function over a parsed mission and the registry agents
// (readRegistry output). Collects findings; never throws.
import { STATUSES, findCycle } from './mission.mjs';
import { coverageReport } from './coverage.mjs';

export function validateAgainstRegistry(mission, agents) {
  const findings = [];
  const tasks = mission.tasks || [];

  const ids = new Set();
  for (const t of tasks) {
    if (ids.has(t.id)) findings.push({ level: 'error', message: `duplicate task id: ${t.id}` });
    ids.add(t.id);
  }

  for (const t of tasks) {
    if (!STATUSES.has(t.status)) {
      findings.push({ level: 'error', message: `task ${t.id}: invalid status "${t.status}".` });
    }
    for (const d of t.deps || []) {
      if (!ids.has(d)) {
        findings.push({ level: 'error', message: `task ${t.id}: dep "${d}" is not a known task id.` });
      }
    }
  }

  const cycle = findCycle(tasks);
  if (cycle) findings.push({ level: 'error', message: `dependency cycle: ${cycle.join(' -> ')}` });

  const names = new Set(agents.map((a) => a.name));
  for (const t of tasks) {
    if (t.agent && !names.has(t.agent)) {
      findings.push({ level: 'error', message: `task ${t.id}: agent "${t.agent}" is not a registered agent.` });
    }
  }

  for (const gap of coverageReport(agents).gaps) {
    findings.push({ level: 'warning', message: `coverage gap: stack layer "${gap}" has no agent.` });
  }

  return findings;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/validate.test.mjs`
Expected: PASS — all six tests.

- [ ] **Step 5: Commit**

```bash
git add lib/validate.mjs lib/validate.test.mjs
git commit -m "feat: add validateAgainstRegistry pre-dispatch audit helper"
```

---

### Task 6: `/validate` command

**Files:**
- Create: `commands/validate.md`
- Modify: `test/commands.test.mjs`

**Interfaces:**
- Consumes: `validateAgainstRegistry` (Task 5), `parseMission`, `readRegistry`.
- Produces: a `/validate` command file; `expected` array now includes `'validate'`.

- [ ] **Step 1: Add `validate` to the command enumeration test**

In `test/commands.test.mjs`, change the `expected` array to:

```js
const expected = ['orchestrate', 'plan', 'status', 'crew', 'resume', 'retry', 'next', 'report', 'validate'];
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/commands.test.mjs`
Expected: FAIL — `missing commands/validate.md`.

- [ ] **Step 3: Create `commands/validate.md`**

```markdown
---
description: Audit the current mission against the registry — consistency and referential errors plus coverage warnings — without blocking.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). Read the agent registry from `agents/` with `readRegistry`
(`lib/registry.mjs`), or use the registry the SessionStart hook put in context. Run
`validateAgainstRegistry` (`lib/validate.mjs`).

- List the findings grouped as errors first, then warnings.
- End with a summary line: "N errors, M warnings", or "all checks passed" when there are none.
- This is advisory and never blocks dispatch. Errors are consistency or referential problems
  (duplicate id, invalid status, unknown dependency, dependency cycle, or an agent not in the
  registry). Warnings are coverage gaps (stack layers with no agent).
- If there is no mission file, say there is no active mission.
```

- [ ] **Step 4: Run the suite to verify it passes**

Run: `node --test`
Expected: PASS — `commands/validate.md` exists with a description and non-empty body.

- [ ] **Step 5: Commit**

```bash
git add commands/validate.md test/commands.test.mjs
git commit -m "feat: add /validate command"
```

---

### Task 7: Release 0.3.0 — versions, CHANGELOG, README

**Files:**
- Modify: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a consistent `0.3.0` release; `test/manifest.test.mjs` still passes (plugin and marketplace versions equal).

- [ ] **Step 1: Bump the three manifests to 0.3.0**

In `package.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`, change the `"version": "0.2.0"` field (and, in `marketplace.json`, the atelier plugin entry's `"version"`) to `"0.3.0"`. Keep plugin and marketplace versions equal.

- [ ] **Step 2: Add the CHANGELOG entry**

In `CHANGELOG.md`, insert above the `## [0.2.0]` section:

```markdown
## [0.3.0] - 2026-06-27

### Added
- Telemetry: an optional `## Metrics` section in the mission file (ID, Agent, Tokens, Duration), round-tripped by `lib/mission.mjs`. The lead records a row per task on completion.
- `lib/metrics.mjs` (`metricsReport`): totals, per-agent breakdown, costliest task, and done tasks missing metrics. Surfaced by the new `/report` command.
- `lib/validate.mjs` (`validateAgainstRegistry`): a non-throwing pre-dispatch audit — consistency and referential errors plus coverage-gap warnings. Surfaced by the new `/validate` command.
- Exported `findCycle` from `lib/mission.mjs`, shared by `validateMission` and the new audit.

```

- [ ] **Step 3: Document the new commands in the README**

In `README.md`, under `## Use`, add these two bullets after the `/retry` line:

```markdown
- `/report`: show per-mission telemetry — total tokens and duration, a per-agent breakdown, and the costliest task.
- `/validate`: audit the current mission against the registry (consistency, unknown agents, coverage gaps); advisory, never blocks.
```

- [ ] **Step 4: Run the full suite**

Run: `node --test`
Expected: PASS — all tests including `test/manifest.test.mjs` (versions equal) and `test/commands.test.mjs` (nine commands).

- [ ] **Step 5: Commit**

```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json CHANGELOG.md README.md
git commit -m "release: 0.3.0 — telemetry/report + validate"
```

---

## Self-Review notes

- **Spec coverage:** Telemetry data source (lead records) → Task 4 skill step; `## Metrics` schema → Task 2 + Task 4 doc; `metricsReport` shape → Task 3; `/report` → Task 4; `validateAgainstRegistry` + findings → Task 5; `findCycle` sharing → Task 1; `/validate` advisory → Task 6; honest task_kind limitation → noted in `/validate` body (no per-task kind check); backward-compat round-trip → Task 2 tests; version/CHANGELOG/README → Task 7. All spec sections map to a task.
- **Type consistency:** `findCycle(tasks)` (Task 1) consumed by Task 5; `metricsReport` fields match the `/report` render (Task 4); `validateAgainstRegistry(mission, agents)` arg is the `readRegistry` array, consistent with `coverageReport(agents)`.
- **No placeholders:** every code/edit step shows the actual content.
