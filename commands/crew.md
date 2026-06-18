---
description: Show the Atelier crew — every registered agent with its layer, capabilities, and task kinds.
---

Read the agent registry from the `agents/` directory with `readRegistry` (from
`lib/registry.mjs`). If the SessionStart hook already put the registry in context, use that.
From the agent array, group by layer and flag routing gaps (any stack layer—backend,
frontend, infra, data, docs—with no agent). You may use `formatRegistry` to show a quick
flat view, but the model should perform the layer-grouping and gap-detection itself.
