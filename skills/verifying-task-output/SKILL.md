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

When you mark a task `done`, append a row to the mission's `## Metrics` section (creating the
section if it is absent) with the task id, the agent that ran it, and your best estimate of
the tokens used and the wall-clock duration in minutes. Leave a cell blank if you cannot
estimate it. `/report` reads these rows.
