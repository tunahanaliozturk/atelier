// Per-mission telemetry. Pure function over a parsed mission (parseMission):
// totals, a per-agent breakdown, the costliest task, and which done tasks lack a row.

export function metricsReport(mission) {
  const metrics = mission.metrics || [];
  const tasks = mission.tasks || [];

  let totalTokens = 0;
  let totalDuration = 0;
  const byAgent = {};
  let costliest = null;

  for (const m of metrics) {
    const tokens = typeof m.tokens === 'number' ? m.tokens : 0;
    const duration = typeof m.duration === 'number' ? m.duration : 0;
    totalTokens += tokens;
    totalDuration += duration;
    const entry = (byAgent[m.agent] ||= { tasks: 0, tokens: 0, duration: 0 });
    entry.tasks += 1;
    entry.tokens += tokens;
    entry.duration += duration;
    if (typeof m.tokens === 'number' && (costliest === null || m.tokens > costliest.tokens)) {
      costliest = { id: m.id, agent: m.agent, tokens: m.tokens };
    }
  }

  const byAgentSorted = {};
  for (const [agent, e] of Object.entries(byAgent).sort((a, b) => b[1].tokens - a[1].tokens)) {
    byAgentSorted[agent] = e;
  }

  const recordedIds = new Set(metrics.map((m) => m.id));
  const missing = tasks
    .filter((t) => t.status === 'done' && !recordedIds.has(t.id))
    .map((t) => t.id);

  return {
    totalTokens,
    totalDuration,
    byAgent: byAgentSorted,
    costliest,
    recorded: metrics.length,
    missing,
  };
}
