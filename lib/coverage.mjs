// Registry coverage report. Pure function over readRegistry() output: which layers are
// populated, their task kinds, and which stack layers have no agent.
import { LAYERS } from './registry.mjs';

const CROSS_CUTTING = ['orchestration', 'review'];

export function stackLayers() {
  return [...LAYERS].filter((l) => !CROSS_CUTTING.includes(l));
}

export function coverageReport(agents) {
  const grouped = {};
  for (const a of agents) {
    const entry = (grouped[a.layer] ||= { agents: [], taskKinds: new Set() });
    entry.agents.push(a.name);
    for (const k of a.task_kinds) entry.taskKinds.add(k);
  }

  const layers = {};
  for (const [layer, e] of Object.entries(grouped)) {
    layers[layer] = {
      agents: [...e.agents].sort(),
      taskKinds: [...e.taskKinds].sort(),
    };
  }

  const stack = stackLayers();
  const gaps = stack.filter((l) => !(layers[l] && layers[l].agents.length > 0));

  return { layers, stackLayers: stack, gaps, crossCutting: CROSS_CUTTING.slice() };
}
