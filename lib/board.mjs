// Rendering helpers for the /status board. Pure string builders over a parsed mission
// and a missionProgress result.

export function progressBar(progress, width = 10) {
  const { total = 0, done = 0, percent = 0 } = progress;
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  const bar = '#'.repeat(filled) + '-'.repeat(width - filled);
  return `[${bar}] ${percent}% (${done}/${total})`;
}

const STATUS_CLASS = {
  done: 'done',
  'in-progress': 'inprogress',
  blocked: 'blocked',
  pending: 'pending',
};

function clean(value) {
  return String(value).replace(/[|"\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function missionMermaid(mission) {
  const tasks = mission.tasks || [];
  const lines = ['graph TD'];
  for (const t of tasks) {
    const cls = STATUS_CLASS[t.status] || 'pending';
    lines.push(`  ${t.id}["${clean(t.id)}: ${clean(t.description)}"]:::${cls}`);
    for (const d of t.deps || []) lines.push(`  ${d} --> ${t.id}`);
  }
  lines.push('  classDef done fill:#bbf7d0,stroke:#16a34a;');
  lines.push('  classDef inprogress fill:#bfdbfe,stroke:#2563eb;');
  lines.push('  classDef blocked fill:#fecaca,stroke:#dc2626;');
  lines.push('  classDef pending fill:#e5e7eb,stroke:#6b7280;');
  return lines.join('\n');
}
