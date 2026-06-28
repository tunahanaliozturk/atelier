import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricsReport } from './metrics.mjs';

function mission(metrics, tasks = []) {
  return { goal: 'g', plan: [], tasks, log: [], metrics };
}

test('metricsReport sums tokens and duration', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'backend-engineer', tokens: 12000, duration: 5 },
    { id: 't2', agent: 'backend-engineer', tokens: 8000, duration: 3 },
  ]));
  assert.equal(r.totalTokens, 20000);
  assert.equal(r.totalDuration, 8);
  assert.equal(r.recorded, 2);
});

test('metricsReport groups by agent ordered by tokens desc', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'frontend-engineer', tokens: 1000, duration: 1 },
    { id: 't2', agent: 'backend-engineer', tokens: 9000, duration: 4 },
  ]));
  assert.deepEqual(Object.keys(r.byAgent), ['backend-engineer', 'frontend-engineer']);
  assert.deepEqual(r.byAgent['backend-engineer'], { tasks: 1, tokens: 9000, duration: 4 });
});

test('metricsReport reports the costliest task', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'a', tokens: 100, duration: 1 },
    { id: 't2', agent: 'b', tokens: 500, duration: 2 },
  ]));
  assert.deepEqual(r.costliest, { id: 't2', agent: 'b', tokens: 500 });
});

test('metricsReport lists done tasks with no metrics row', () => {
  const r = metricsReport(mission(
    [{ id: 't1', agent: 'a', tokens: 100, duration: 1 }],
    [
      { id: 't1', description: 'x', agent: 'a', status: 'done', deps: [] },
      { id: 't2', description: 'y', agent: 'b', status: 'done', deps: [] },
      { id: 't3', description: 'z', agent: 'c', status: 'pending', deps: [] },
    ],
  ));
  assert.deepEqual(r.missing, ['t2']);
});

test('metricsReport treats null tokens as zero and yields null costliest when all null', () => {
  const r = metricsReport(mission([
    { id: 't1', agent: 'a', tokens: null, duration: null },
  ]));
  assert.equal(r.totalTokens, 0);
  assert.equal(r.totalDuration, 0);
  assert.equal(r.costliest, null);
  assert.equal(r.recorded, 1);
});

test('metricsReport on an empty metrics set is all zeros', () => {
  assert.deepEqual(metricsReport(mission([])), {
    totalTokens: 0, totalDuration: 0, byAgent: {}, costliest: null, recorded: 0, missing: [],
  });
});
