import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressBar, missionMermaid } from './board.mjs';

test('progressBar renders a filled/empty bar with percent and counts', () => {
  assert.equal(
    progressBar({ total: 6, done: 3, percent: 50 }),
    '[#####-----] 50% (3/6)',
  );
});

test('progressBar handles an empty mission', () => {
  assert.equal(progressBar({ total: 0, done: 0, percent: 0 }), '[----------] 0% (0/0)');
});

test('missionMermaid emits a classed node per task and dependency edges', () => {
  const m = {
    tasks: [
      { id: 't1', description: 'set up', agent: 'x', status: 'done', deps: [] },
      { id: 't2', description: 'build', agent: 'y', status: 'pending', deps: ['t1'] },
    ],
  };
  const out = missionMermaid(m);
  assert.match(out, /^graph TD/);
  assert.match(out, /t1\["t1: set up"\]:::done/);
  assert.match(out, /t2\["t2: build"\]:::pending/);
  assert.match(out, /t1 --> t2/);
  assert.match(out, /classDef done/);
});

test('missionMermaid sanitizes characters that break mermaid', () => {
  const m = { tasks: [{ id: 't1', description: 'a | "b"\nc', agent: 'x', status: 'in-progress', deps: [] }] };
  const out = missionMermaid(m);
  assert.ok(!out.includes('|'));
  assert.ok(!/t1\[".*".*".*"\]/.test(out)); // no stray inner quotes
  assert.match(out, /:::inprogress/);
});
