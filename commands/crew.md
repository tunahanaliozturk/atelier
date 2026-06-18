---
description: Show the Atelier crew — every registered agent with its layer, capabilities, and task kinds.
---

Read the agent registry from the `agents/` directory with `readRegistry` (from
`lib/registry.mjs`) and render it with `formatRegistry`. If the SessionStart hook already
put the registry in context, use that. Present the crew board grouped by layer so the user
can see which task kinds are covered and which layers have no specialist. If a stack layer
(backend, frontend, infra, data, docs) has no agent, note it as a routing gap.
