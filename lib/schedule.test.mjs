import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyTasks, missionProgress } from './schedule.mjs';

function mission(tasks) {
  return { goal: 'g', plan: [], tasks, log: [] };
}

test('readyTasks returns pending tasks with no deps', () => {
  const m = mission([{ id: 't1', description: 'a', agent: 'x', status: 'pending', deps: [] }]);
  assert.deepEqual(readyTasks(m).map((t) => t.id), ['t1']);
});

test('readyTasks includes a pending task whose deps are all done', () => {
  const m = mission([
    { id: 't1', description: 'a', agent: 'x', status: 'done', deps: [] },
    { id: 't2', description: 'b', agent: 'y', status: 'pending', deps: ['t1'] },
  ]);
  assert.deepEqual(readyTasks(m).map((t) => t.id), ['t2']);
});

test('readyTasks excludes a task with an unfinished dep', () => {
  const m = mission([
    { id: 't1', description: 'a', agent: 'x', status: 'in-progress', deps: [] },
    { id: 't2', description: 'b', agent: 'y', status: 'pending', deps: ['t1'] },
  ]);
  assert.deepEqual(readyTasks(m).map((t) => t.id), []);
});

test('readyTasks excludes non-pending tasks and sorts by id', () => {
  const m = mission([
    { id: 't2', description: 'b', agent: 'y', status: 'pending', deps: [] },
    { id: 't1', description: 'a', agent: 'x', status: 'pending', deps: [] },
    { id: 't3', description: 'c', agent: 'z', status: 'done', deps: [] },
  ]);
  assert.deepEqual(readyTasks(m).map((t) => t.id), ['t1', 't2']);
});

test('readyTasks does not throw on an unknown dep id and treats it as not ready', () => {
  const m = mission([{ id: 't1', description: 'a', agent: 'x', status: 'pending', deps: ['ghost'] }]);
  assert.deepEqual(readyTasks(m), []);
});

test('missionProgress counts statuses and computes percent', () => {
  const m = mission([
    { id: 't1', description: 'a', agent: 'x', status: 'done', deps: [] },
    { id: 't2', description: 'b', agent: 'y', status: 'done', deps: [] },
    { id: 't3', description: 'c', agent: 'z', status: 'in-progress', deps: [] },
    { id: 't4', description: 'd', agent: 'w', status: 'blocked', deps: [] },
  ]);
  assert.deepEqual(missionProgress(m), {
    total: 4, done: 2, inProgress: 1, blocked: 1, pending: 0, percent: 50,
  });
});

test('missionProgress on an empty mission yields zero percent', () => {
  assert.deepEqual(missionProgress(mission([])), {
    total: 0, done: 0, inProgress: 0, blocked: 0, pending: 0, percent: 0,
  });
});
