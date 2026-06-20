---
description: Show the current Atelier mission board — progress, grouped tasks, the ready set, and a dependency graph.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). If there is no mission file, say there is no active
mission and stop.

Render, in this order:

1. The goal.
2. A progress line from `missionProgress` + `progressBar` (`lib/board.mjs`), for example
   `[#####-----] 50% (3/6)`.
3. The tasks grouped by status — in-progress, pending, blocked, done — each a short list
   of ID, description, and agent.
4. "Ready now": the `readyTasks` (`lib/schedule.mjs`) output (ID, description, agent); if
   empty, say why (all done, all blocked, or waiting on deps).
5. A dependency graph from `missionMermaid` (`lib/board.mjs`) inside a ```mermaid block.
6. The most recent decision-log entries.
