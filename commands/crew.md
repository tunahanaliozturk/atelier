---
description: Show the Atelier crew and its capability coverage — agents by layer, task kinds, and routing gaps.
---

Read the agent registry from `agents/` with `readRegistry` (`lib/registry.mjs`), or use the
registry the SessionStart hook put in context. Build a coverage report with `coverageReport`
(`lib/coverage.mjs`) and render:

- Each populated layer with its agents, their capabilities, and the union of task kinds.
- A "Coverage" line: which stack layers are populated.
- A "Gaps" line: stack layers (`backend, frontend, infra, data, docs, qa, mobile, ml`) with
  no agent, or "no gaps". When there is a gap, note that the lead scaffolds an agent with
  the writing-agents skill.

`formatRegistry` gives a quick flat view if you want one.
