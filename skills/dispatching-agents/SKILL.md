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
