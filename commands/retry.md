---
description: Retry a blocked task in the current Atelier mission, or all blocked tasks if no id is given.
argument-hint: "[task-id]"
---

Retry work in the most recently modified mission file under `.atelier/missions/`:

1. Read and parse it with `parseMission` (from `lib/mission.mjs`). If there is no mission
   file, say so and stop.
2. Determine the targets: if `$ARGUMENTS` names a task id, that one task; otherwise every
   task whose status is `blocked`. If a named id does not exist or there are no blocked
   tasks, say so and stop.
3. For each target, reset its status to `pending` with `setTaskStatus`, append a decision-log
   entry recording the retry and why, and write the file back with `renderMission`.
4. Dispatch each reset task to its assigned agent and run it through the full verify loop
   (verifying-task-output: spec review, then quality review). Update the mission with the
   mission-tracking skill to `done` or `blocked` as the outcome dictates.
