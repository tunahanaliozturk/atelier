import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coarseFilter, scoreCandidate, route } from './routing.mjs';

const crew = [
  { name: 'backend-engineer', capabilities: ['api', 'services'], layer: 'backend', task_kinds: ['implement', 'refactor', 'test'] },
  { name: 'frontend-engineer', capabilities: ['ui', 'components'], layer: 'frontend', task_kinds: ['implement', 'refactor', 'test'] },
  { name: 'data-engineer', capabilities: ['schema', 'queries'], layer: 'data', task_kinds: ['implement', 'migrate', 'model'] },
  // same layer+kinds+score as backend for tie-break check, name sorts after:
  { name: 'zeta-backend', capabilities: ['api', 'services'], layer: 'backend', task_kinds: ['implement', 'refactor', 'test'] },
];

test('coarseFilter keeps only layer- and kind-compatible agents', () => {
  const out = coarseFilter({ kind: 'migrate', layer: 'data' }, crew);
  assert.deepEqual(out.map((a) => a.name), ['data-engineer']);
});

test('coarseFilter without a layer matches any layer with the kind', () => {
  const out = coarseFilter({ kind: 'model' }, crew);
  assert.deepEqual(out.map((a) => a.name), ['data-engineer']);
});

test('scoreCandidate rewards kind match and capability overlap', () => {
  const agent = crew[0];
  assert.equal(scoreCandidate({ kind: 'implement', capabilities: ['api'] }, agent), 3);
  assert.equal(scoreCandidate({ kind: 'implement', capabilities: ['api', 'services'] }, agent), 4);
  assert.equal(scoreCandidate({ kind: 'implement' }, agent), 2);
});

test('route picks the highest score and records a reason', () => {
  const r = route({ kind: 'implement', layer: 'frontend', capabilities: ['ui'] }, crew);
  assert.equal(r.pick, 'frontend-engineer');
  assert.equal(r.fallback, false);
  assert.match(r.reason, /frontend-engineer/);
});

test('route breaks ties by name ascending', () => {
  const r = route({ kind: 'implement', layer: 'backend', capabilities: ['api'] }, crew);
  assert.deepEqual(r.candidates.map((c) => c.name), ['backend-engineer', 'zeta-backend']);
  assert.equal(r.pick, 'backend-engineer');
});

test('route returns a fallback when no agent fits', () => {
  const r = route({ kind: 'security-review', layer: 'review' }, crew);
  assert.equal(r.pick, null);
  assert.equal(r.fallback, true);
  assert.equal(r.candidates.length, 0);
});
