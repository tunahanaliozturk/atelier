import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMission, parseMission, validateMission, setTaskStatus } from './mission.mjs';

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

test('a task with multiple dependencies round-trips the dep list', () => {
  const m = {
    goal: 'g',
    plan: [],
    tasks: [{ id: 'T4', description: 'wire it', agent: 'backend-engineer', status: 'pending', deps: ['T1', 'T3'] }],
    log: [],
  };
  assert.deepEqual(parseMission(renderMission(m)), m);
});

test('round-trips an in-progress status, a special-char goal, and empty sections', () => {
  const m = {
    goal: 'Add OAuth2 support (v2)',
    plan: [],
    tasks: [{ id: 'T1', description: 'start it', agent: 'backend-engineer', status: 'in-progress', deps: [] }],
    log: [],
  };
  assert.deepEqual(parseMission(renderMission(m)), m);
});

test('tolerates extra spaces after the number in a hand-edited plan step', () => {
  const md = '# Mission: g\n\n## Plan\n\n1.   spaced step\n\n## Tasks\n\n## Decision log\n\n';
  assert.deepEqual(parseMission(md).plan, ['spaced step']);
});

test('render throws when a task description contains a pipe character', () => {
  const m = {
    goal: 'g',
    plan: [],
    tasks: [{ id: 'T1', description: 'a | b', agent: 'planner', status: 'pending', deps: [] }],
    log: [],
  };
  assert.throws(() => renderMission(m), /must not contain the pipe character/i);
});

test('validateMission accepts a well-formed mission', () => {
  const m = { goal: 'g', plan: [], log: [], tasks: [
    { id: 'T1', description: 'a', agent: 'x', status: 'pending', deps: [] },
    { id: 'T2', description: 'b', agent: 'y', status: 'done', deps: ['T1'] },
  ] };
  assert.equal(validateMission(m), m);
});

test('validateMission rejects an invalid status', () => {
  const m = { tasks: [{ id: 'T1', status: 'wip', deps: [] }] };
  assert.throws(() => validateMission(m), /invalid status/);
});

test('validateMission rejects a duplicate task id', () => {
  const m = { tasks: [
    { id: 'T1', status: 'pending', deps: [] },
    { id: 'T1', status: 'done', deps: [] },
  ] };
  assert.throws(() => validateMission(m), /duplicate task id/);
});

test('validateMission rejects an unknown dependency', () => {
  const m = { tasks: [{ id: 'T1', status: 'pending', deps: ['T9'] }] };
  assert.throws(() => validateMission(m), /not a known task id/);
});

test('validateMission detects a dependency cycle', () => {
  const m = { tasks: [
    { id: 'T1', status: 'pending', deps: ['T2'] },
    { id: 'T2', status: 'pending', deps: ['T1'] },
  ] };
  assert.throws(() => validateMission(m), /cycle/);
});

test('setTaskStatus updates the matching task', () => {
  const m = { tasks: [{ id: 'T1', status: 'blocked', deps: [] }] };
  setTaskStatus(m, 'T1', 'pending');
  assert.equal(m.tasks[0].status, 'pending');
});

test('setTaskStatus rejects an unknown id', () => {
  const m = { tasks: [{ id: 'T1', status: 'pending', deps: [] }] };
  assert.throws(() => setTaskStatus(m, 'T9', 'done'), /no task with id/);
});

test('setTaskStatus rejects an invalid status', () => {
  const m = { tasks: [{ id: 'T1', status: 'pending', deps: [] }] };
  assert.throws(() => setTaskStatus(m, 'T1', 'wip'), /invalid status/);
});
