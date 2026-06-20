---
description: Show the tasks that can start now — pending tasks whose dependencies are all done.
---

Read the most recently modified mission file under `.atelier/missions/` and parse it with
`parseMission` (`lib/mission.mjs`). Compute the ready set with `readyTasks` (`lib/schedule.mjs`)
and the counts with `missionProgress`.

- List each ready task: ID, description, and assigned agent.
- If nothing is ready, name which case it is, using the counts: every task is `done`
  (mission complete), every remaining task is `blocked`, or the rest are waiting on
  unfinished dependencies — name the tasks they wait on.
- If there is no mission file, say there is no active mission.
