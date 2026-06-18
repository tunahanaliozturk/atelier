---
description: Continue the most recent Atelier mission from where it left off, without re-approving the plan.
---

Resume the most recently modified mission file under `.atelier/missions/`:

1. Read it and parse it with `parseMission` (from `lib/mission.mjs`); run `validateMission`
   to catch a corrupted board. If there is no mission file, say there is no mission to
   resume and stop.
2. Render the current board (the task table and the latest decision-log entries). The plan
   was already approved when the mission was created, so do not ask for plan approval
   again.
3. Compute the runnable wave: tasks that are not `done` and whose deps are all `done`.
   Show which tasks will run next and ask the user to confirm before dispatching with the
   dispatching-agents skill, so resuming is never a surprise.
4. On confirmation, dispatch and verify exactly as /orchestrate does after approval, keeping
   the mission file current with the mission-tracking skill. If every task is already
   `done`, say the mission is complete.
