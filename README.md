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
