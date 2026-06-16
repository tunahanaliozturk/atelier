# Atelier Core (Phase 1 + 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the installable Atelier orchestration core: a Claude Code plugin where a lead agent reviews a plan, gates on user approval, and routes tasks to specialist agents by declared capability, with a persistent mission task board.

**Architecture:** Markdown-defined plugin (agents, skills, commands are `.md`; manifests are JSON; one `SessionStart` hook). A small dependency-free Node library (`lib/`) parses the agent capability registry and reads/writes the mission file. The hook surfaces the registry into context each session so the lead always knows the crew.

**Tech Stack:** Claude Code plugin format; Node.js ES modules (`.mjs`) with the built-in `node:test` runner (no external dependencies); JSON manifests; Markdown content.

**Scope note:** This plan covers Phase 1 (foundation) and Phase 2 (orchestration core). Phase 3 (specialist crew) and Phase 4 (multi-platform) are follow-on plans. Spec: `docs/specs/2026-06-16-atelier-design.md`.

**Conventions for every commit in this plan:** no emojis, no em-dashes, and no `Co-Authored-By` trailer.

---

## File structure (created by this plan)

```
atelier/
  package.json                         # name, type:module, test script
  .gitignore
  LICENSE                              # MIT
  README.md
  CHANGELOG.md
  .claude-plugin/
    plugin.json
    marketplace.json
  lib/
    frontmatter.mjs                    # minimal frontmatter parser
    frontmatter.test.mjs
    registry.mjs                       # read + format the agent capability registry
    registry.test.mjs
    mission.mjs                        # render + parse the mission file
    mission.test.mjs
  hooks/
    hooks.json                         # SessionStart -> session-start.mjs
    session-start.mjs                  # prints the registry summary
  agents/
    lead.md
    planner.md
    spec-reviewer.md
    code-quality-reviewer.md
  skills/
    reviewing-plans/SKILL.md
    capability-routing/SKILL.md
    dispatching-agents/SKILL.md
    verifying-task-output/SKILL.md
    mission-tracking/SKILL.md
    writing-plans/SKILL.md
  commands/
    orchestrate.md
    plan.md
    status.md
  docs/
    schemas/
      capability-schema.md
      mission-schema.md
  test/
    manifest.test.mjs                  # validates plugin.json + marketplace.json
    agents.test.mjs                    # validates the agent registry
    skills.test.mjs                    # validates skills frontmatter
    commands.test.mjs                  # validates command frontmatter
```

Run all tests at any point with: `node --test` (from the repo root). Expected when complete: all tests pass.

---

### Task 1: Repo scaffold

**Files:**
- Create: `package.json`, `.gitignore`, `LICENSE`, `CHANGELOG.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "atelier",
  "version": "0.1.0",
  "description": "Agent-orchestration plugin for Claude Code.",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.atelier/
*.log
.DS_Store
```

- [ ] **Step 3: Create `LICENSE`** (MIT, owner `Tunahan Ali Ozturk`, year 2026). Use the standard MIT license text with that copyright line.

- [ ] **Step 4: Create `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to Atelier are documented in this file. The format is based on
Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Phase 1 + 2: installable orchestration core (capability registry, lead pipeline, mission file).
```

- [ ] **Step 5: Verify `node --test` runs with no tests**

Run: `node --test`
Expected: exits 0 with "tests 0" (no test files yet).

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore LICENSE CHANGELOG.md
git commit -m "Scaffold Atelier repo (package.json, license, changelog)"
```

---

### Task 2: Frontmatter parser

**Files:**
- Create: `lib/frontmatter.mjs`
- Test: `lib/frontmatter.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/frontmatter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './frontmatter.mjs';

test('parses scalar and inline-array fields and returns the body', () => {
  const text = '---\nname: lead\ncapabilities: [a, b]\n---\nbody line\n';
  const { data, body } = parseFrontmatter(text);
  assert.equal(data.name, 'lead');
  assert.deepEqual(data.capabilities, ['a', 'b']);
  assert.equal(body.trim(), 'body line');
});

test('strips surrounding quotes from a scalar value', () => {
  const { data } = parseFrontmatter('---\ndescription: "hello world"\n---\n');
  assert.equal(data.description, 'hello world');
});

test('returns an empty array for an empty inline array', () => {
  const { data } = parseFrontmatter('---\ntags: []\n---\n');
  assert.deepEqual(data.tags, []);
});

test('throws when the frontmatter block is missing', () => {
  assert.throws(() => parseFrontmatter('no frontmatter here'), /malformed frontmatter/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/frontmatter.test.mjs`
Expected: FAIL (cannot find module `./frontmatter.mjs`).

- [ ] **Step 3: Implement `lib/frontmatter.mjs`**

```js
// Minimal frontmatter parser for Atelier markdown files.
// Supports scalar values and single-line inline arrays: key: [a, b, c].
// Values may be wrapped in single or double quotes. No nested objects, no
// multi-line scalars (keep authored frontmatter on one line per key).

export function parseFrontmatter(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseFrontmatter expects a string.');
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) {
    throw new Error('Missing or malformed frontmatter block.');
  }
  const [, block, body] = match;
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) {
      throw new Error(`Malformed frontmatter line (no colon): ${rawLine}`);
    }
    const key = line.slice(0, sep).trim();
    data[key] = parseValue(line.slice(sep + 1).trim());
  }
  return { data, body };
}

function parseValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((item) => stripQuotes(item.trim()));
  }
  return stripQuotes(value);
}

function stripQuotes(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/frontmatter.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/frontmatter.mjs lib/frontmatter.test.mjs
git commit -m "Add minimal frontmatter parser with tests"
```

---

### Task 3: Capability registry reader

**Files:**
- Create: `lib/registry.mjs`
- Test: `lib/registry.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/registry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry, formatRegistry } from './registry.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(
    join(dir, 'lead.md'),
    '---\nname: lead\ndescription: Coordinates the crew.\ncapabilities: [orchestration]\nlayer: orchestration\ntask_kinds: [coordinate]\n---\nbody\n',
  );
  return dir;
}

test('reads every agent and exposes its capability fields', () => {
  const agents = readRegistry(fixture());
  assert.equal(agents.length, 1);
  assert.equal(agents[0].name, 'lead');
  assert.deepEqual(agents[0].capabilities, ['orchestration']);
  assert.equal(agents[0].layer, 'orchestration');
  assert.deepEqual(agents[0].task_kinds, ['coordinate']);
  assert.equal(agents[0].file, 'lead.md');
});

test('throws when a required field is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(join(dir, 'bad.md'), '---\nname: bad\n---\nbody\n');
  assert.throws(() => readRegistry(dir), /missing required field/i);
});

test('throws when capabilities is not a list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(
    join(dir, 'bad.md'),
    '---\nname: bad\ndescription: x\ncapabilities: dotnet\nlayer: backend\ntask_kinds: [implement]\n---\nbody\n',
  );
  assert.throws(() => readRegistry(dir), /must be a list/i);
});

test('formatRegistry lists each agent on its own line', () => {
  const agents = readRegistry(fixture());
  const out = formatRegistry(agents);
  assert.match(out, /Atelier crew \(capability registry\)/);
  assert.match(out, /lead \[orchestration\]/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/registry.test.mjs`
Expected: FAIL (cannot find module `./registry.mjs`).

- [ ] **Step 3: Implement `lib/registry.mjs`**

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';

const SCALAR_FIELDS = ['name', 'description', 'layer'];
const LIST_FIELDS = ['capabilities', 'task_kinds'];

export function readRegistry(agentsDir) {
  const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort();
  const agents = [];
  for (const file of files) {
    const { data } = parseFrontmatter(readFileSync(join(agentsDir, file), 'utf8'));
    const missing = [...SCALAR_FIELDS, ...LIST_FIELDS].filter((k) => data[k] === undefined);
    if (missing.length > 0) {
      throw new Error(`${file}: missing required field(s): ${missing.join(', ')}`);
    }
    for (const k of LIST_FIELDS) {
      if (!Array.isArray(data[k])) {
        throw new Error(`${file}: field "${k}" must be a list (use [a, b]).`);
      }
    }
    agents.push({
      name: data.name,
      description: data.description,
      capabilities: data.capabilities,
      layer: data.layer,
      task_kinds: data.task_kinds,
      file,
    });
  }
  return agents;
}

export function formatRegistry(agents) {
  if (agents.length === 0) return 'Atelier: no agents registered.';
  const lines = ['Atelier crew (capability registry):'];
  for (const a of agents) {
    lines.push(
      `- ${a.name} [${a.layer}] caps: ${a.capabilities.join(', ')}; does: ${a.task_kinds.join(', ')}`,
    );
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/registry.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/registry.mjs lib/registry.test.mjs
git commit -m "Add capability registry reader with validation and tests"
```

---

### Task 4: Plugin manifests

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Test: `test/manifest.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/manifest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plugin = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
const market = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'));

test('plugin.json has the required fields', () => {
  for (const k of ['name', 'description', 'version', 'license']) {
    assert.ok(plugin[k], `missing ${k}`);
  }
  assert.equal(plugin.name, 'atelier');
});

test('marketplace lists the atelier plugin at the same version', () => {
  const entry = market.plugins.find((p) => p.name === 'atelier');
  assert.ok(entry, 'atelier not listed in marketplace');
  assert.equal(entry.version, plugin.version);
  assert.equal(entry.source, './');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/manifest.test.mjs`
Expected: FAIL (cannot read `.claude-plugin/plugin.json`).

- [ ] **Step 3: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "atelier",
  "description": "Agent-orchestration plugin: a lead reviews a plan, gates on user approval, and routes tasks to specialist agents by capability.",
  "version": "0.1.0",
  "author": { "name": "Tunahan Ali Ozturk" },
  "homepage": "https://github.com/tunahanaliozturk/atelier",
  "repository": "https://github.com/tunahanaliozturk/atelier",
  "license": "MIT",
  "keywords": ["agents", "orchestration", "workflow", "claude-code", "planning"]
}
```

- [ ] **Step 4: Create `.claude-plugin/marketplace.json`**

```json
{
  "name": "atelier",
  "description": "Atelier agent-orchestration plugin marketplace.",
  "owner": { "name": "Tunahan Ali Ozturk" },
  "plugins": [
    {
      "name": "atelier",
      "description": "Agent-orchestration plugin: lead-reviewed plans, capability-routed dispatch, persistent mission board.",
      "version": "0.1.0",
      "source": "./",
      "author": { "name": "Tunahan Ali Ozturk" }
    }
  ]
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test/manifest.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json test/manifest.test.mjs
git commit -m "Add plugin and marketplace manifests with validation test"
```

---

### Task 5: Capability schema doc and the four core agents

**Files:**
- Create: `docs/schemas/capability-schema.md`, `agents/lead.md`, `agents/planner.md`, `agents/spec-reviewer.md`, `agents/code-quality-reviewer.md`
- Test: `test/agents.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/agents.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRegistry } from '../lib/registry.mjs';

const agents = readRegistry('agents');
const byName = Object.fromEntries(agents.map((a) => [a.name, a]));

test('the four core agents are registered and valid', () => {
  for (const name of ['lead', 'planner', 'spec-reviewer', 'code-quality-reviewer']) {
    assert.ok(byName[name], `missing agent ${name}`);
  }
});

test('the lead agent is in the orchestration layer', () => {
  assert.equal(byName.lead.layer, 'orchestration');
  assert.ok(byName.lead.task_kinds.length > 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/agents.test.mjs`
Expected: FAIL (no `agents/` directory).

- [ ] **Step 3: Create `docs/schemas/capability-schema.md`**

```markdown
# Agent capability schema

Every agent in `agents/` is a Markdown file whose frontmatter the lead reads to route
work. Keep each frontmatter value on a single line.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | string | Unique agent id. |
| `description` | string | One line; what the agent does and when to pick it. |
| `capabilities` | list | Skills or domains, for example `[dotnet, api, testing]`. |
| `layer` | string | One of `orchestration`, `backend`, `frontend`, `infra`, `data`, `docs`, `review`. |
| `task_kinds` | list | What it does, for example `[implement, refactor, optimize]`. |

The lead routes by a coarse filter on `layer` and `task_kinds`, then picks the best
candidate by reading `description`. Add an agent by creating a file here that follows this
schema; the `SessionStart` hook will surface it automatically.
```

- [ ] **Step 4: Create `agents/lead.md`**

```markdown
---
name: lead
description: Reviews a draft plan, gates on user approval, decomposes it into a task graph, and routes each task to the best-matched specialist agent.
capabilities: [orchestration, planning, review, routing]
layer: orchestration
task_kinds: [coordinate, review, decompose, dispatch]
model: opus
color: blue
---

You are the Atelier lead. You coordinate a crew of specialist agents and report only to
the user.

## Responsibilities

1. Take a draft plan from the planner and review it: find gaps, risks, wrong ordering, and
   any task whose required capability no specialist covers. Revise the plan.
2. Present the mission (plan plus task-to-agent assignments) to the user and wait for
   approval before any work begins.
3. Decompose the approved plan into a task graph and assign each task an agent from the
   capability registry, using the capability-routing skill.
4. Dispatch tasks: independent tasks in parallel, dependent tasks in order.
5. Verify each task output with the verifying-task-output skill; on failure, send it back
   or reassign.
6. Keep the mission file current at every step (mission-tracking skill).

## Rules

- Never start work before the user approves the task breakdown.
- Route by capability, not convenience; if no agent fits, say so and propose adding one.
- The mission file is the single source of truth; update it, do not narrate state.
```

- [ ] **Step 5: Create `agents/planner.md`**

```markdown
---
name: planner
description: Drafts an implementation plan as ordered steps with explicit dependencies, ready for the lead to review.
capabilities: [planning, decomposition, analysis]
layer: orchestration
task_kinds: [plan, analyze]
model: opus
color: green
---

You are the Atelier planner. Given a goal, you produce a draft plan: a numbered list of
steps, each with its dependencies and the kind of work it is (implement, test, review,
refactor, docs, infra). You do not assign agents and you do not start work. Favor small,
independently testable steps. Surface risks and unknowns explicitly so the lead can act on
them. Hand the draft to the lead.
```

- [ ] **Step 6: Create `agents/spec-reviewer.md`**

```markdown
---
name: spec-reviewer
description: Checks that a task output matches its assigned task and the approved plan, with nothing missing and nothing extra.
capabilities: [review, requirements, verification]
layer: review
task_kinds: [review, verify]
model: sonnet
color: yellow
---

You are the Atelier spec reviewer. Given a task and its output, confirm the output does
exactly what the task asked: nothing missing, nothing extra. Report a short verdict
(compliant or a list of gaps and extras). You do not judge code quality; that is the
code-quality-reviewer's job.
```

- [ ] **Step 7: Create `agents/code-quality-reviewer.md`**

```markdown
---
name: code-quality-reviewer
description: Reviews task output for correctness, clarity, and maintainability after it passes spec review.
capabilities: [review, code-quality, testing]
layer: review
task_kinds: [review, verify]
model: sonnet
color: orange
---

You are the Atelier code-quality reviewer. After spec review passes, review the output for
correctness, readability, test coverage, and maintainability. Report strengths and any
issues ranked by importance. Approve only when the output is sound.
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `node --test test/agents.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add docs/schemas/capability-schema.md agents/ test/agents.test.mjs
git commit -m "Add capability schema and the four core orchestration agents"
```

---

### Task 6: SessionStart hook

**Files:**
- Create: `hooks/session-start.mjs`, `hooks/hooks.json`
- Test: `test/hook.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/hook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('session-start prints the registry summary including the lead', () => {
  const out = execFileSync('node', ['hooks/session-start.mjs'], { encoding: 'utf8' });
  assert.match(out, /Atelier crew \(capability registry\)/);
  assert.match(out, /lead \[orchestration\]/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/hook.test.mjs`
Expected: FAIL (cannot find `hooks/session-start.mjs`).

- [ ] **Step 3: Implement `hooks/session-start.mjs`**

```js
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRegistry, formatRegistry } from '../lib/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const agentsDir = join(here, '..', 'agents');

try {
  process.stdout.write(formatRegistry(readRegistry(agentsDir)) + '\n');
} catch (err) {
  // Surfacing the registry is best-effort and must never break the session.
  process.stdout.write(`Atelier: registry load skipped (${err.message}).\n`);
}
```

- [ ] **Step 4: Create `hooks/hooks.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs\"",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test/hook.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add hooks/session-start.mjs hooks/hooks.json test/hook.test.mjs
git commit -m "Add SessionStart hook that surfaces the capability registry"
```

---

### Task 7: Mission file helper

**Files:**
- Create: `lib/mission.mjs`, `docs/schemas/mission-schema.md`
- Test: `lib/mission.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/mission.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMission, parseMission } from './mission.mjs';

const mission = {
  goal: 'Add a health endpoint',
  plan: ['Design the route', 'Implement it', 'Test it'],
  tasks: [
    { id: 'T1', description: 'Design the route', agent: 'planner', status: 'done', deps: [] },
    { id: 'T2', description: 'Implement the route', agent: 'backend-engineer', status: 'pending', deps: ['T1'] },
  ],
  log: ['Routed T2 to backend-engineer by layer match'],
};

test('a mission round-trips through render then parse unchanged', () => {
  assert.deepEqual(parseMission(renderMission(mission)), mission);
});

test('parse throws when the mission heading is missing', () => {
  assert.throws(() => parseMission('## Plan\n'), /Mission/);
});

test('a task with no dependencies renders and parses as an empty list', () => {
  const out = renderMission({ goal: 'g', plan: [], tasks: [{ id: 'T1', description: 'x', agent: 'planner', status: 'pending', deps: [] }], log: [] });
  assert.deepEqual(parseMission(out).tasks[0].deps, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/mission.test.mjs`
Expected: FAIL (cannot find module `./mission.mjs`).

- [ ] **Step 3: Implement `lib/mission.mjs`**

```js
// Render and parse the Atelier mission file. The mission is the single source of truth
// for a run. Task descriptions must not contain the pipe character (table delimiter).

export function renderMission(mission) {
  const { goal, plan = [], tasks = [], log = [] } = mission;
  const lines = [`# Mission: ${goal}`, '', '## Plan', ''];
  plan.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('', '## Tasks', '', '| ID | Description | Agent | Status | Deps |', '| --- | --- | --- | --- | --- |');
  for (const t of tasks) {
    const deps = t.deps && t.deps.length ? t.deps.join(',') : '-';
    lines.push(`| ${t.id} | ${t.description} | ${t.agent} | ${t.status} | ${deps} |`);
  }
  lines.push('', '## Decision log', '');
  for (const entry of log) lines.push(`- ${entry}`);
  lines.push('');
  return lines.join('\n');
}

export function parseMission(markdown) {
  const lines = markdown.split(/\r?\n/);
  const goalLine = lines.find((l) => l.startsWith('# Mission: '));
  if (!goalLine) throw new Error('Mission file missing "# Mission:" heading.');
  const goal = goalLine.slice('# Mission: '.length).trim();

  const section = (name) => {
    const start = lines.findIndex((l) => l.trim() === `## ${name}`);
    if (start === -1) return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) break;
      out.push(lines[i]);
    }
    return out;
  };

  const plan = section('Plan')
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s/, ''));

  const tasks = section('Tasks')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*ID\s*\|/.test(l) && !/^\|\s*---/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      const [id, description, agent, status, deps] = cells;
      return {
        id,
        description,
        agent,
        status,
        deps: deps === '-' || deps === '' ? [] : deps.split(',').map((d) => d.trim()),
      };
    });

  const log = section('Decision log')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2));

  return { goal, plan, tasks, log };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/mission.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Create `docs/schemas/mission-schema.md`**

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add lib/mission.mjs lib/mission.test.mjs docs/schemas/mission-schema.md
git commit -m "Add mission file render/parse helper with round-trip test and schema"
```

---

### Task 8: Core skills

**Files:**
- Create: `skills/reviewing-plans/SKILL.md`, `skills/capability-routing/SKILL.md`, `skills/dispatching-agents/SKILL.md`, `skills/verifying-task-output/SKILL.md`, `skills/mission-tracking/SKILL.md`, `skills/writing-plans/SKILL.md`
- Test: `test/skills.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/skills.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const expected = [
  'reviewing-plans',
  'capability-routing',
  'dispatching-agents',
  'verifying-task-output',
  'mission-tracking',
  'writing-plans',
];

test('every expected skill exists with name and description frontmatter', () => {
  for (const name of expected) {
    const path = join('skills', name, 'SKILL.md');
    assert.ok(existsSync(path), `missing ${path}`);
    const { data } = parseFrontmatter(readFileSync(path, 'utf8'));
    assert.equal(data.name, name, `${name}: frontmatter name must match folder`);
    assert.ok(data.description && data.description.length > 0, `${name}: missing description`);
  }
});

test('no skill folder is missing a SKILL.md', () => {
  for (const entry of readdirSync('skills', { withFileTypes: true })) {
    if (entry.isDirectory()) {
      assert.ok(existsSync(join('skills', entry.name, 'SKILL.md')), `${entry.name}: no SKILL.md`);
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/skills.test.mjs`
Expected: FAIL (no `skills/` directory).

- [ ] **Step 3: Create `skills/reviewing-plans/SKILL.md`**

```markdown
---
name: reviewing-plans
description: Use when the lead receives a draft plan, to review the plan itself before any work starts.
---

# Reviewing Plans

Review a draft plan against four checks before presenting it to the user:

1. Completeness: does every part of the goal map to a step? List gaps.
2. Ordering and dependencies: is anything sequenced wrong or missing a dependency?
3. Risk: which steps are risky or unknown, and is there a step to de-risk them?
4. Capability coverage: for each step, is there a registered agent whose layer and
   task_kinds can do it? If a step has no owner, flag it and propose adding an agent.

Revise the plan to fix what you find, then hand it to the user gate.
```

- [ ] **Step 4: Create `skills/capability-routing/SKILL.md`**

```markdown
---
name: capability-routing
description: Use when the lead assigns a task to an agent, to match the task to the best-fit specialist by capability.
---

# Capability Routing

Route each task in two stages:

1. Coarse filter: keep only agents whose `layer` fits the task and whose `task_kinds`
   include the task's kind. The registry is in context from the SessionStart hook.
2. Final pick: among the filtered agents, read each `description` and pick the closest
   match. Record the choice and the reason in the mission decision log.

If the filter is empty, do not force a poor fit. Tell the user no agent covers the task and
propose adding one with the writing-agents skill.
```

- [ ] **Step 5: Create `skills/dispatching-agents/SKILL.md`**

```markdown
---
name: dispatching-agents
description: Use when the lead runs an approved mission, to dispatch tasks in the right order and concurrency.
---

# Dispatching Agents

Dispatch from the mission task graph:

1. A task is runnable when all of its deps are `done`.
2. Run all currently-runnable, independent tasks in parallel; run dependent tasks only
   after their deps complete.
3. Each task goes to its assigned agent via the Task tool.
4. After each task returns, verify it (verifying-task-output) and update the mission before
   dispatching the next wave.

Never dispatch a task whose deps are not yet done.
```

- [ ] **Step 6: Create `skills/verifying-task-output/SKILL.md`**

```markdown
---
name: verifying-task-output
description: Use after a dispatched task returns, to verify the output before marking it done.
---

# Verifying Task Output

Verify in two stages, in order:

1. Spec review (spec-reviewer agent): does the output do exactly what the task asked,
   nothing missing or extra? If not, send the task back to its agent with the gaps.
2. Code-quality review (code-quality-reviewer agent): only after spec review passes. If it
   raises issues, send them back.

Mark the task `done` only when both pass. If an agent cannot resolve a blocker, mark the
task `blocked` and surface it to the user.
```

- [ ] **Step 7: Create `skills/mission-tracking/SKILL.md`**

```markdown
---
name: mission-tracking
description: Use throughout a run to keep the mission file current as the single source of truth.
---

# Mission Tracking

The mission file at `.atelier/missions/<date>-<goal-slug>.md` is the single source of
truth. Follow the mission schema (`docs/schemas/mission-schema.md`):

- Write it when the plan is approved (Plan and Tasks sections, all tasks `pending`).
- Update a task's Status as it moves through `in-progress`, `blocked`, `done`.
- Append routing and ordering decisions to the Decision log.

Do not narrate state in prose instead of updating the file. `/status` reads this file.
```

- [ ] **Step 8: Create `skills/writing-plans/SKILL.md`**

```markdown
---
name: writing-plans
description: Use when the planner drafts a plan, to produce small, ordered, testable steps with dependencies.
---

# Writing Plans

Produce a numbered plan where each step is one small, independently testable action. For
each step record its dependencies and its kind (implement, test, review, refactor, docs,
infra). Prefer many small steps over a few large ones. Call out risks and unknowns as their
own steps. Do not assign agents; the lead does that.
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `node --test test/skills.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add skills/ test/skills.test.mjs
git commit -m "Add the six core orchestration skills"
```

---

### Task 9: Slash commands

**Files:**
- Create: `commands/orchestrate.md`, `commands/plan.md`, `commands/status.md`
- Test: `test/commands.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const expected = ['orchestrate', 'plan', 'status'];

test('every command exists with a description and a non-empty body', () => {
  for (const name of expected) {
    const path = join('commands', `${name}.md`);
    assert.ok(existsSync(path), `missing ${path}`);
    const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
    assert.ok(data.description && data.description.length > 0, `${name}: missing description`);
    assert.ok(body.trim().length > 0, `${name}: empty body`);
  }
});

test('orchestrate references the user-gate and capability routing', () => {
  const body = readFileSync(join('commands', 'orchestrate.md'), 'utf8');
  assert.match(body, /capability-routing/);
  assert.match(body, /approval/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/commands.test.mjs`
Expected: FAIL (no `commands/` directory).

- [ ] **Step 3: Create `commands/orchestrate.md`**

```markdown
---
description: Plan a goal, review it as the lead, get user approval, then dispatch tasks to specialist agents by capability.
---

Run the full Atelier pipeline for this goal: $ARGUMENTS

1. Use the planner agent to draft a plan (writing-plans skill).
2. As the lead, review the draft with the reviewing-plans skill and revise it.
3. Write the mission file (mission-tracking skill) and present the plan plus the
   task-to-agent assignments to the user. Stop and wait for explicit approval. Do not start
   work before approval.
4. After approval, decompose into tasks and assign agents with the capability-routing
   skill.
5. Dispatch with the dispatching-agents skill; verify each result with the
   verifying-task-output skill; keep the mission file current throughout.
```

- [ ] **Step 4: Create `commands/plan.md`**

```markdown
---
description: Draft and lead-review a plan for a goal and present it for approval, without starting any work.
---

Plan this goal without executing it: $ARGUMENTS

1. Use the planner agent to draft a plan (writing-plans skill).
2. As the lead, review it with the reviewing-plans skill and revise it.
3. Write the mission file (mission-tracking skill) with all tasks `pending` and present the
   plan plus proposed agent assignments to the user. Stop there; run /dispatch later to
   execute.
```

- [ ] **Step 5: Create `commands/status.md`**

```markdown
---
description: Show the current Atelier mission task board.
---

Read the most recent mission file under `.atelier/missions/` and render its task board:
the goal, the task table (ID, Description, Agent, Status, Deps), and the latest decision-log
entries. If there is no mission file, say there is no active mission.
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test test/commands.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add commands/ test/commands.test.mjs
git commit -m "Add orchestrate, plan, and status slash commands"
```

---

### Task 10: README and full-suite green

**Files:**
- Create: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# Atelier

Agent-orchestration plugin for Claude Code. A lead agent reviews a plan, gates on your
approval, and routes each task to the specialist agent best matched by capability, while a
persistent mission file tracks the task board.

## How it differs from a skills library

Atelier is built around a lead coordinator, not a single agent reading skills. Agents
declare their capabilities; the lead routes tasks to them. The plan is reviewed by the lead
and approved by you before any work starts, and a mission file is the single source of
truth.

## Install

```bash
claude plugin marketplace add tunahanaliozturk/atelier
claude plugin install atelier
```

## Use

- `/orchestrate <goal>`: plan, lead-review, approve, then dispatch to specialists.
- `/plan <goal>`: plan and lead-review only, stop at approval.
- `/status`: show the current mission task board.

## Extend the crew

Add an agent under `agents/` following `docs/schemas/capability-schema.md`. The SessionStart
hook surfaces it automatically and the lead can route to it.

## Develop

```bash
node --test
```
````

- [ ] **Step 2: Update `CHANGELOG.md`** under `## [Unreleased]` to list the shipped pieces:

```markdown
### Added
- Capability registry: agents declare capabilities; the lead routes tasks to them.
- Lead orchestration pipeline: plan, lead review, user approval gate, capability-routed dispatch, per-task verification.
- Mission file as the single source of truth, with a render/parse helper.
- Commands: /orchestrate, /plan, /status. Skills: reviewing-plans, capability-routing, dispatching-agents, verifying-task-output, mission-tracking, writing-plans. Agents: lead, planner, spec-reviewer, code-quality-reviewer. SessionStart hook.
```

- [ ] **Step 3: Run the full suite**

Run: `node --test`
Expected: PASS (all test files green: frontmatter 4, registry 4, manifest 2, agents 2, hook 1, mission 3, skills 2, commands 2).

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "Add README and finalize Phase 1+2 changelog"
```

---

## Done criteria for this plan

- `node --test` is green from the repo root.
- The plugin installs and the SessionStart hook prints the capability registry.
- `/orchestrate <goal>` drives the full pipeline: planner draft, lead review, user approval
  gate, capability-routed decomposition, dispatch, per-task verification, with a mission
  task board readable via `/status`.
- The five differentiators from the spec are present: lead coordinator, capability registry,
  plan governance with a user gate, capability-matched dispatch with verification, and the
  persistent mission artifact.

Follow-on: Phase 3 (specialist crew, `/agents`, `/add-agent`, writing-agents skill) and
Phase 4 (multi-platform bridges, sync test, CI) get their own plans.
