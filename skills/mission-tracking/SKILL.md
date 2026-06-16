---
name: mission-tracking
description: Use throughout a run to keep the mission file current as the single source of truth.
---

# Mission Tracking

The mission file at `.atelier/missions/<date>-<goal-slug>.md` is the single source of
truth. Follow the mission schema (`docs/schemas/mission-schema.md`):

- Write it when the plan is approved (Plan and Tasks sections, all tasks `pending`).
- Update a task's Status as it moves through `in-progress`, `blocked`, `done`.
- Append routing and ordering decisions to the Decision log.

Do not narrate state in prose instead of updating the file. `/status` reads this file.
