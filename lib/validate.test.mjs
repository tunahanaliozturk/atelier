import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAgainstRegistry } from './validate.mjs';

const agents = [
  { name: 'backend-engineer', layer: 'backend', task_kinds: ['implement'], capabilities: [] },
  { name: 'planner', layer: 'orchestration', task_kinds: ['plan'], capabilities: [] },
];

function mission(tasks) {
  return { goal: 'g', plan: [], tasks, log: [], metrics: [] };
}

const errors = (f) => f.filter((x) => x.level === 'error').map((x) => x.message);
const warnings = (f) => f.filter((x) => x.level === 'warning').map((x) => x.message);

test('a consistent mission with known agents has no errors', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: [] }]),
    agents,
  );
  assert.deepEqual(errors(f), []);
});

test('flags a task whose agent is not registered', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'ghost', status: 'pending', deps: [] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /agent "ghost"/.test(m)));
});

test('flags an unknown dependency', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: ['t9'] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /not a known task id/.test(m)));
});

test('flags an invalid status', () => {
  const f = validateAgainstRegistry(
    mission([{ id: 't1', description: 'a', agent: 'backend-engineer', status: 'wip', deps: [] }]),
    agents,
  );
  assert.ok(errors(f).some((m) => /invalid status/.test(m)));
});

test('never throws on a cyclic mission and reports the cycle', () => {
  const f = validateAgainstRegistry(
    mission([
      { id: 't1', description: 'a', agent: 'backend-engineer', status: 'pending', deps: ['t2'] },
      { id: 't2', description: 'b', agent: 'backend-engineer', status: 'pending', deps: ['t1'] },
    ]),
    agents,
  );
  assert.ok(errors(f).some((m) => /cycle/.test(m)));
});

test('warns about coverage gaps', () => {
  const f = validateAgainstRegistry(mission([]), agents);
  assert.ok(warnings(f).some((m) => /frontend/.test(m)));
});
