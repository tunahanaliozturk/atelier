---
description: Audit the current mission against the registry — consistency and referential errors plus coverage warnings — without blocking.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). Read the agent registry from `agents/` with `readRegistry`
(`lib/registry.mjs`), or use the registry the SessionStart hook put in context. Run
`validateAgainstRegistry` (`lib/validate.mjs`).

- List the findings grouped as errors first, then warnings.
- End with a summary line: "N errors, M warnings", or "all checks passed" when there are none.
- This is advisory and never blocks dispatch. Errors are consistency or referential problems
  (duplicate id, invalid status, unknown dependency, dependency cycle, or an agent not in the
  registry). Warnings are coverage gaps (stack layers with no agent).
- If there is no mission file, say there is no active mission.
