// Render and parse the Atelier mission file. The mission is the single source of truth
// for a run. Task descriptions must not contain the pipe character (table delimiter).

export function renderMission(mission) {
  const { goal, plan = [], tasks = [], log = [] } = mission;
  const lines = [`# Mission: ${goal}`, '', '## Plan', ''];
  plan.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('', '## Tasks', '', '| ID | Description | Agent | Status | Deps |', '| --- | --- | --- | --- | --- |');
  for (const t of tasks) {
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
