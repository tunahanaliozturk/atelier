import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';

const SCALAR_FIELDS = ['name', 'description', 'layer'];
const LIST_FIELDS = ['capabilities', 'task_kinds'];

export const LAYERS = new Set([
  'orchestration', 'backend', 'frontend', 'infra', 'data', 'docs', 'review',
]);

export function readRegistry(agentsDir) {
  const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort();
  const agents = [];
  for (const file of files) {
    const { data } = parseFrontmatter(readFileSync(join(agentsDir, file), 'utf8'));
    const missing = [...SCALAR_FIELDS, ...LIST_FIELDS].filter((k) => data[k] === undefined);
    if (missing.length > 0) {
      throw new Error(`${file}: missing required field(s): ${missing.join(', ')}`);
    }
    for (const k of LIST_FIELDS) {
      if (!Array.isArray(data[k])) {
        throw new Error(`${file}: field "${k}" must be a list (use [a, b]).`);
      }
    }
    if (!LAYERS.has(data.layer)) {
      throw new Error(`${file}: layer "${data.layer}" is not one of ${[...LAYERS].join(', ')}.`);
    }
    if (data.task_kinds.length === 0) {
      throw new Error(`${file}: task_kinds must not be empty.`);
    }
    if (agents.some((a) => a.name === data.name)) {
      throw new Error(`${file}: duplicate agent name "${data.name}".`);
    }
    agents.push({
      name: data.name,
      description: data.description,
      capabilities: data.capabilities,
      layer: data.layer,
      task_kinds: data.task_kinds,
      file,
    });
  }
  return agents;
}

export function formatRegistry(agents) {
  if (agents.length === 0) return 'Atelier: no agents registered.';
  const lines = ['Atelier crew (capability registry):'];
  for (const a of agents) {
    lines.push(
      `- ${a.name} [${a.layer}] caps: ${a.capabilities.join(', ')}; does: ${a.task_kinds.join(', ')}`,
    );
  }
  return lines.join('\n');
}
