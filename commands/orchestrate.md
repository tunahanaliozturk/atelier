---
description: Plan a goal, review it as the lead, get user approval, then dispatch tasks to specialist agents by capability.
---

Run the full Atelier pipeline for this goal: $ARGUMENTS

1. Use the planner agent to draft a plan (writing-plans skill).
2. As the lead, review the draft with the reviewing-plans skill and revise it.
3. Write the mission file (mission-tracking skill) and present the plan plus the
   task-to-agent assignments to the user. Stop and wait for explicit approval. Do not start
   work before approval.
4. After approval, decompose into tasks and assign agents with the capability-routing
   skill.
5. Dispatch with the dispatching-agents skill; verify each result with the
   verifying-task-output skill; keep the mission file current throughout.
