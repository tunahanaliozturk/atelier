---
name: capability-routing
description: Use when the lead assigns a task to an agent, to match the task to the best-fit specialist by capability.
---

# Capability Routing

Route each task with the `lib/routing.mjs` helper, then apply judgment:

1. Build the task descriptor `{ kind, layer?, capabilities? }` from the planner's tagged
   step. The registry is in context from the SessionStart hook; if it is not (a session
   started without the hook), read the `agents/` directory with `readRegistry` first.
2. Call `route(task, agents)`. It coarse-filters by `layer` and `task_kinds`, scores each
   candidate by `task_kinds` and `capabilities` overlap, and breaks ties deterministically
   (score descending, then name ascending).
3. If `route` returns `fallback: true`, no agent fits. Do not force a poor match: tell the
   user and use the writing-agents skill to scaffold a new agent that follows the
   capability schema.
4. Otherwise take `pick` as the default. You may override it for a documented reason by
   reading the candidates' `description`s — but record the final choice and the `reason`
   (including the score) in the mission decision log.

The `orchestration` and `review` layers are cross-cutting: the planner, lead, and reviewers
are invoked by name in a fixed order, not selected by this filter.
