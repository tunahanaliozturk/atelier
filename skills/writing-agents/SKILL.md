---
name: writing-agents
description: Use when no registered agent covers a task, to scaffold a new specialist agent that follows the capability schema.
---

# Writing Agents

When capability-routing returns a fallback (no agent fits), scaffold a new specialist
rather than forcing a poor match.

1. Name the gap: what `layer` and `task_kinds` does the uncovered task need? Confirm the
   layer is one of `orchestration`, `backend`, `frontend`, `infra`, `data`, `docs`,
   `review`.
2. Create `agents/<name>.md` with frontmatter that follows
   `docs/schemas/capability-schema.md`: `name`, `description` (one line: what it does and
   when to pick it), `capabilities` (list), `layer`, `task_kinds` (list), and optional
   `model` and `color`. Keep each value on a single line.
3. Write a short body: who the agent is, exactly what it does, and that it works only to
   the assigned task and reports back concisely.
4. Verify it loads: `node hooks/session-start.mjs` must list the new agent with no
   `registry load skipped` line (the registry validates layer, non-empty task_kinds, and
   unique names).
5. Re-route the task with capability-routing; the new agent should now be the pick. Record
   the addition in the mission decision log.
