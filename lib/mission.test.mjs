import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMission, parseMission } from './mission.mjs';

const mission = {
  goal: 'Add a health endpoint',
  plan: ['Design the route', 'Implement it', 'Test it'],
  tasks: [
    { id: 'T1', description: 'Design the route', agent: 'planner', status: 'done', deps: [] },
    { id: 'T2', description: 'Implement the route', agent: 'backend-engineer', status: 'pending', deps: ['T1'] },
  ],
  log: ['Routed T2 to backend-engineer by layer match'],
};

test('a mission round-trips through render then parse unchanged', () => {
  assert.deepEqual(parseMission(renderMission(mission)), mission);
});

test('parse throws when the mission heading is missing', () => {
  assert.throws(() => parseMission('## Plan\n'), /Mission/);
});

test('a task with no dependencies renders and parses as an empty list', () => {
  const out = renderMission({ goal: 'g', plan: [], tasks: [{ id: 'T1', description: 'x', agent: 'planner', status: 'pending', deps: [] }], log: [] });
  assert.deepEqual(parseMission(out).tasks[0].deps, []);
});
