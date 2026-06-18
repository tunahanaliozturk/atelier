// Deterministic routing helpers. Given a task descriptor and the agent registry
// (from readRegistry), filter to layer/kind-compatible agents and rank them by
// capability fit. The capability-routing skill leans on this for the mechanical
// stages; the lead still reads descriptions for the final nuance.

export function coarseFilter(task, agents) {
  return agents.filter(
    (a) =>
      (task.layer === undefined || a.layer === task.layer) &&
      a.task_kinds.includes(task.kind),
  );
}

export function scoreCandidate(task, agent) {
  let score = 0;
  if (agent.task_kinds.includes(task.kind)) score += 2;
  for (const cap of task.capabilities || []) {
    if (agent.capabilities.includes(cap)) score += 1;
  }
  return score;
}

export function route(task, agents) {
  const filtered = coarseFilter(task, agents);
  if (filtered.length === 0) {
    const where = task.layer ? ` in layer "${task.layer}"` : '';
    return {
      candidates: [],
      pick: null,
      reason: `no agent covers kind "${task.kind}"${where}`,
      fallback: true,
    };
  }
  const candidates = filtered
    .map((a) => ({ name: a.name, score: scoreCandidate(task, a) }))
    .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  const top = candidates[0];
  return {
    candidates,
    pick: top.name,
    reason: `picked ${top.name} (score ${top.score}) for kind "${task.kind}"`,
    fallback: false,
  };
}
