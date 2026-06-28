---
description: Show per-mission telemetry — total tokens and duration, a per-agent breakdown, the costliest task, and any done tasks missing metrics.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). Compute the report with `metricsReport` (`lib/metrics.mjs`).

- Header: total tokens, total duration in minutes, and how many tasks have metrics recorded
  (`recorded`) versus the number of `done` tasks.
- A per-agent table sorted by tokens descending: agent, tasks, tokens, duration.
- The costliest task (ID, agent, tokens), or note that no metrics are recorded yet when it is
  null.
- A "missing metrics" note listing any `done` task ids that have no metrics row, so the lead
  can fill them in.
- If there is no mission file, say there is no active mission. If the mission has no `## Metrics`
  rows, say so and point to how the lead records them: a row per task on completion.
