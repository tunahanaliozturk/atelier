# Changelog

All notable changes to Atelier are documented in this file. The format is based on
Keep a Changelog and this project adheres to Semantic Versioning.

## [0.2.0] - 2026-06-20

### Added
- Capability registry: agents declare capabilities; the lead routes tasks to them.
- Lead orchestration pipeline: plan, lead review, user approval gate, capability-routed dispatch, per-task verification.
- Mission file as the single source of truth, with a render/parse helper.
- Commands: /orchestrate, /plan, /status. Skills: reviewing-plans, capability-routing, dispatching-agents, verifying-task-output, mission-tracking, writing-plans. Agents: lead, planner, spec-reviewer, code-quality-reviewer. SessionStart hook.
- Specialist crew: backend, frontend, infra, data, and docs engineers, plus a security reviewer, so the lead can route real implementation work.
- Deterministic routing helper (`lib/routing.mjs`): scored, tie-broken candidate selection with an explicit no-fit fallback.
- Mission validation (`validateMission`) and a `setTaskStatus` helper; registry validation of layer, task kinds, and unique agent names.
- Commands: /crew, /resume, /retry. Skill: writing-agents (scaffold a new specialist when routing finds a gap).
- Ready-set scheduler (`lib/schedule.mjs`): `readyTasks` and `missionProgress`, surfaced by the new `/next` command and the `/status` board.
- Registry coverage doctor (`lib/coverage.mjs`): `coverageReport`/`stackLayers`, surfaced by `/crew` (agents by layer, task kinds, and routing gaps).
- Board rendering (`lib/board.mjs`): `progressBar` and a color-coded `missionMermaid` dependency graph for `/status`.
- Specialist agents and layers: `qa-engineer` (qa), `mobile-engineer` (mobile), `ml-engineer` (ml).
- Continuous integration: `node --test` on Node 18/20/22 via GitHub Actions.
- README: concepts, a pipeline diagram, badges, and a worked `/orchestrate` example.
