// Deterministic mission scheduling helpers. Pure functions over a parsed mission
// (from parseMission): which tasks can start now, and overall progress.

export function readyTasks(mission) {
  const tasks = mission.tasks || [];
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  return tasks
    .filter(
      (t) =>
        t.status === 'pending' &&
        (t.deps || []).every((d) => statusById.get(d) === 'done'),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function missionProgress(mission) {
  const tasks = mission.tasks || [];
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const total = tasks.length;
  const done = count('done');
  return {
    total,
    done,
    inProgress: count('in-progress'),
    blocked: count('blocked'),
    pending: count('pending'),
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
