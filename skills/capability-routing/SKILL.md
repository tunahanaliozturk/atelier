---
name: capability-routing
description: Use when the lead assigns a task to an agent, to match the task to the best-fit specialist by capability.
---

# Capability Routing

Route each task in two stages:

1. Coarse filter: keep only agents whose `layer` fits the task and whose `task_kinds`
   include the task's kind. The registry is in context from the SessionStart hook; if it is
   not (a session started without the hook), read the `agents/` directory directly.
2. Final pick: among the filtered agents, read each `description` and pick the closest
   match. Record the choice and the reason in the mission decision log.

If the filter is empty, do not force a poor fit. Tell the user no agent covers the task and
propose adding one that follows the capability schema (the writing-agents skill that
scaffolds this arrives in a later release).
