// Pre-dispatch audit. Pure function over a parsed mission and the registry agents
// (readRegistry output). Collects findings; never throws.
import { STATUSES, findCycle } from './mission.mjs';
import { coverageReport } from './coverage.mjs';

export function validateAgainstRegistry(mission, agents) {
  const findings = [];
  const tasks = mission.tasks || [];

  const ids = new Set();
  for (const t of tasks) {
    if (ids.has(t.id)) findings.push({ level: 'error', message: `duplicate task id: ${t.id}` });
    ids.add(t.id);
  }

  for (const t of tasks) {
    if (!STATUSES.has(t.status)) {
      findings.push({ level: 'error', message: `task ${t.id}: invalid status "${t.status}".` });
    }
    for (const d of t.deps || []) {
      if (!ids.has(d)) {
        findings.push({ level: 'error', message: `task ${t.id}: dep "${d}" is not a known task id.` });
      }
    }
  }

  const cycle = findCycle(tasks);
  if (cycle) findings.push({ level: 'error', message: `dependency cycle: ${cycle.join(' -> ')}` });

  const names = new Set(agents.map((a) => a.name));
  for (const t of tasks) {
    if (t.agent && !names.has(t.agent)) {
      findings.push({ level: 'error', message: `task ${t.id}: agent "${t.agent}" is not a registered agent.` });
    }
  }

  for (const gap of coverageReport(agents).gaps) {
    findings.push({ level: 'warning', message: `coverage gap: stack layer "${gap}" has no agent.` });
  }

  return findings;
}
