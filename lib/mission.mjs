// Render and parse the Atelier mission file. The mission is the single source of truth
// for a run. Task descriptions must not contain the pipe character (table delimiter).

export function renderMission(mission) {
  const { goal, plan = [], tasks = [], log = [] } = mission;
  const lines = [`# Mission: ${goal}`, '', '## Plan', ''];
  plan.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('', '## Tasks', '', '| ID | Description | Agent | Status | Deps |', '| --- | --- | --- | --- | --- |');
  for (const t of tasks) {
    if (typeof t.description === 'string' && t.description.includes('|')) {
      throw new Error(`task ${t.id}: description must not contain the pipe character.`);
    }
    const deps = t.deps && t.deps.length ? t.deps.join(',') : '-';
    lines.push(`| ${t.id} | ${t.description} | ${t.agent} | ${t.status} | ${deps} |`);
  }
  lines.push('', '## Decision log', '');
  for (const entry of log) lines.push(`- ${entry}`);
  lines.push('');
  return lines.join('\n');
}

export function parseMission(markdown) {
  const lines = markdown.split(/\r?\n/);
  const goalLine = lines.find((l) => l.startsWith('# Mission: '));
  if (!goalLine) throw new Error('Mission file missing "# Mission:" heading.');
  const goal = goalLine.slice('# Mission: '.length).trim();

  const section = (name) => {
    const start = lines.findIndex((l) => l.trim() === `## ${name}`);
    if (start === -1) return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) break;
      out.push(lines[i]);
    }
    return out;
  };

  const plan = section('Plan')
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, ''));

  const tasks = section('Tasks')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*ID\s*\|/.test(l) && !/^\|\s*---/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      const [id, description, agent, status, deps] = cells;
      return {
        id,
        description,
        agent,
        status,
        deps: deps === '-' || deps === '' ? [] : deps.split(',').map((d) => d.trim()),
      };
    });

  const log = section('Decision log')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2));

  return { goal, plan, tasks, log };
}

export const STATUSES = new Set(['pending', 'in-progress', 'blocked', 'done']);

export function validateMission(mission) {
  const tasks = mission.tasks || [];
  const ids = new Set();
  for (const t of tasks) {
    if (ids.has(t.id)) throw new Error(`duplicate task id: ${t.id}`);
    ids.add(t.id);
  }
  for (const t of tasks) {
    if (!STATUSES.has(t.status)) {
      throw new Error(`task ${t.id}: invalid status "${t.status}".`);
    }
    for (const d of t.deps || []) {
      if (!ids.has(d)) {
        throw new Error(`task ${t.id}: dep "${d}" is not a known task id.`);
      }
    }
  }
  const cycle = findCycle(tasks);
  if (cycle) throw new Error(`dependency cycle: ${cycle.join(' -> ')}`);
  return mission;
}

export function findCycle(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map(); // id -> 'visiting' | 'done'
  let cycle = null;
  const visit = (id, stack) => {
    if (cycle) return;
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      cycle = [...stack, id];
      return;
    }
    state.set(id, 'visiting');
    for (const d of byId.get(id).deps || []) {
      if (byId.has(d)) visit(d, [...stack, id]);
      if (cycle) return;
    }
    state.set(id, 'done');
  };
  for (const t of tasks) {
    visit(t.id, []);
    if (cycle) break;
  }
  return cycle;
}

export function setTaskStatus(mission, id, status) {
  if (!STATUSES.has(status)) throw new Error(`invalid status "${status}".`);
  const task = (mission.tasks || []).find((t) => t.id === id);
  if (!task) throw new Error(`no task with id "${id}".`);
  task.status = status;
  return mission;
}
