# Atelier Design

**Status:** Draft for review
**Date:** 2026-06-16
**Owner:** tunahanaliozturk

## Goal

Atelier is a multi-platform agent-orchestration plugin for Claude Code (and Codex,
Cursor, Gemini, opencode). It is built around a *lead* agent that drafts and reviews a
plan, presents the task breakdown to the user for approval, and then dispatches the work
to specialist agents chosen by their declared capabilities. The metaphor is a master-led
workshop: a lead coordinates a crew of specialists, each doing what they are best at.

The first public release is a broad suite: the orchestration core plus a crew of 10 or
more capability-tagged specialist agents, multiple slash commands, supporting skills, a
session hook, and bridges for the non-Claude platforms.

## How Atelier differs from superpowers

superpowers is a knowledge library: a single main agent reads the right skill at the right
moment. Atelier is an orchestration layer built around a lead coordinator. The five
concrete differences, treated as fixed requirements:

1. **Orchestration-first, not library-first.** A lead agent coordinates a crew rather than
   the main loop reading skills by itself.
2. **Capability registry.** Agents declare what they can do in structured frontmatter; the
   lead routes each task to the best-matched agent. superpowers has no capability routing.
3. **Plan governance.** A planner drafts the plan, the lead reviews the plan itself (not
   only the resulting code), and the user approves the task breakdown before any work
   begins.
4. **Parallel, capability-matched dispatch** with a per-task verification loop.
5. **Persistent mission artifact.** A living file holds the plan, the task graph, the
   agent assignments, and live status, so both humans and agents read from one source of
   truth and can see the task board.

## Architecture and repo layout

Atelier follows the proven superpowers plugin layout, adapted for orchestration. The
canonical source is authored in Claude Code format; the other platforms are generated
bridges.

```
atelier/
  .claude-plugin/
    plugin.json          # name, version, description, repository, license
    marketplace.json     # enables install via gh
  agents/                # specialist sub-agents (.md with capability frontmatter)
  skills/                # workflow guides (SKILL.md per skill)
  commands/              # slash commands (orchestrate, plan, dispatch, status, agents, add-agent)
  hooks/
    hooks.json           # SessionStart: scan the agent registry; load active mission
  lib/                   # registry reader + mission-file helpers (scripts)
  docs/
    specs/               # design specs (this file)
    schemas/             # capability schema, mission schema
    usage/               # how-to docs
  .codex-plugin/  .cursor-plugin/  .opencode/  gemini-extension.json   # platform bridges (phase 4)
  README.md  LICENSE  CHANGELOG.md  RELEASE-NOTES.md
```

## Capability registry (the technical heart of the differentiator)

Every agent `.md` carries structured frontmatter the lead reads to route work:

```yaml
name: backend-engineer
description: Implements and reviews server-side code, APIs, and data access.
capabilities: [dotnet, api, ef-core, testing]
layer: backend          # backend | frontend | infra | data | docs | review | orchestration
task_kinds: [implement, refactor, optimize]
```

Routing is hybrid:

1. **Coarse filter by tags.** The lead narrows candidates by `layer` and `task_kinds`
   (for example a `frontend + implement` task considers only frontend implementers).
2. **Final pick by judgment.** Among the filtered candidates the lead reads the
   descriptions and chooses the best fit, and may explain the choice in the mission log.

The registry is scanned once per session by the `SessionStart` hook so the lead always
knows the current crew. The capability schema is documented in `docs/schemas/` so users
can extend the crew with their own agents.

## Orchestration pipeline

The flagship command `/orchestrate <goal>` runs this pipeline:

```
1. planner agent  -> drafts a plan (steps plus dependencies)
2. lead agent     -> reviews the plan: gaps, risks, ordering, capability coverage; revises it
3. USER GATE      -> the lead presents the mission file (plan plus task-to-agent assignments);
                     the user approves, rejects, or requests changes
4. lead           -> decomposes the approved plan into a task graph and assigns each task an
                     agent from the registry
5. dispatch       -> independent tasks run in parallel, dependent tasks run in order; each task
                     goes to its assigned specialist
6. lead/reviewer  -> verifies each task output; on BLOCKED or failure it sends the task back or
                     reassigns it
7. mission update -> the mission file (task board) is updated at every step; /status renders it
```

Smaller commands expose parts of the pipeline:

- `/plan <goal>` runs steps 1 to 3 and stops at the user gate.
- `/dispatch` takes an approved mission and runs steps 4 to 7.
- `/status` renders the current mission task board.
- `/agents` lists the registered agents and their capabilities.
- `/add-agent` scaffolds a new capability-tagged agent.

## Mission artifact

Each run writes a mission file at `.atelier/missions/<date>-<goal-slug>.md` containing:

- the approved plan,
- a task table (id, description, assigned agent, status, dependencies),
- a decision log (why the lead routed or reordered something).

It is the single source of truth. The `SessionStart` hook loads an active mission if one
exists so a run can resume across sessions.

## Component inventory (v1)

**Agents (13).** Existing user agents are generalized and folded in.

- Orchestration core: `lead` (from tech-lead), `planner` (from solution-architect),
  `spec-reviewer`, `code-quality-reviewer`.
- Specialist crew (capability-tagged): `backend-engineer`, `frontend-engineer` (from
  senior-frontend-engineer), `test-writer` (from test-scenario-writer), `debugger`,
  `refactorer`, `devops-engineer`, `data-engineer`, `docs-writer`, `security-reviewer`.

**Skills.** `writing-plans`, `reviewing-plans` (differentiator), `capability-routing`
(differentiator), `dispatching-agents`, `verifying-task-output`, `mission-tracking`,
`systematic-debugging`, `test-driven-development`, `writing-agents` (so users extend the
registry).

**Commands.** `/orchestrate`, `/plan`, `/dispatch`, `/status`, `/agents`, `/add-agent`.

**Hooks.** `SessionStart` scans the `agents/` registry into context and loads any active
mission. Kept minimal for v1.

## Multi-platform and packaging

The canonical source is Claude Code format. Parallel manifests plus a sync script generate
the Codex, Cursor, Gemini, and opencode bridges, mirroring the superpowers approach, with a
"sync is not stale" test. Packaging: `plugin.json` plus `marketplace.json` for install via
`gh`; semantic versioning with `CHANGELOG` and `RELEASE-NOTES`; MIT license; a GitHub
Actions workflow running lint and the sync test.

## Build phases

The spec covers the full vision; implementation is layered so a broad suite does not ship
half-finished. The first implementation plan covers phases 1 and 2 (the installable
orchestration core); phases 3 and 4 are follow-on plans.

- **Phase 1 - Foundation.** Repo scaffold, `plugin.json` plus `marketplace.json`, capability
  schema, `SessionStart` hook, README skeleton. Result: an installable shell.
- **Phase 2 - Orchestration core (showcase).** `lead`, `planner`, and the two reviewer agents;
  the mission artifact plus `lib/` helpers; `/orchestrate`, `/plan`, `/status`; the core
  skills (`reviewing-plans`, `capability-routing`, `dispatching-agents`,
  `verifying-task-output`, `mission-tracking`). Result: the differentiator works end to end
  with four agents.
- **Phase 3 - Specialist crew.** The 10-plus specialist agents with capabilities; `/agents`
  and `/add-agent`; the `writing-agents` skill.
- **Phase 4 - Multi-platform and polish.** Platform bridges plus the sync script and test; CI;
  versioning and release notes.

## Testing approach

- **Registry parsing.** A test that the `lib/` registry reader parses every agent's
  capability frontmatter and rejects malformed frontmatter.
- **Routing.** Given a synthetic registry and a task, the coarse filter selects the correct
  candidate set (the judgment step is exercised through scenario docs, not asserted).
- **Mission file.** Round-trip read and write of a mission file keeps the task table intact.
- **Skill triggering.** Each skill's description triggers in the intended situation
  (mirrors the superpowers skill-triggering tests).
- **Multi-platform sync.** A test that the generated bridges match the canonical source
  (phase 4).

## Success criteria

- A user can install Atelier from GitHub via `gh` and run `/orchestrate <goal>` end to end:
  plan drafted, lead-reviewed, approved at the user gate, decomposed, dispatched to
  capability-matched specialists, verified, with a readable mission task board.
- The capability registry is documented and extensible: a user can add an agent and have
  the lead route to it without code changes.
- The five differentiators versus superpowers are all present and visible.

## Open questions

None blocking. Final agent count and exact capability vocabulary will be refined during the
phase 3 plan.
