# Changelog

All notable changes to Atelier are documented in this file. The format is based on
Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Capability registry: agents declare capabilities; the lead routes tasks to them.
- Lead orchestration pipeline: plan, lead review, user approval gate, capability-routed dispatch, per-task verification.
- Mission file as the single source of truth, with a render/parse helper.
- Commands: /orchestrate, /plan, /status. Skills: reviewing-plans, capability-routing, dispatching-agents, verifying-task-output, mission-tracking, writing-plans. Agents: lead, planner, spec-reviewer, code-quality-reviewer. SessionStart hook.
- Specialist crew: backend, frontend, infra, data, and docs engineers, plus a security reviewer, so the lead can route real implementation work.
- Deterministic routing helper (`lib/routing.mjs`): scored, tie-broken candidate selection with an explicit no-fit fallback.
- Mission validation (`validateMission`) and a `setTaskStatus` helper; registry validation of layer, task kinds, and unique agent names.
- Commands: /crew, /resume, /retry. Skill: writing-agents (scaffold a new specialist when routing finds a gap).
