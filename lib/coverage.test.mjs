import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverageReport, stackLayers } from './coverage.mjs';

test('stackLayers excludes the cross-cutting layers', () => {
  const stack = stackLayers();
  assert.ok(!stack.includes('orchestration'));
  assert.ok(!stack.includes('review'));
  assert.ok(stack.includes('backend'));
});

test('coverageReport groups agents by layer with deduped, sorted task kinds', () => {
  const agents = [
    { name: 'b1', layer: 'backend', capabilities: ['api'], task_kinds: ['implement', 'refactor'] },
    { name: 'b2', layer: 'backend', capabilities: ['db'], task_kinds: ['implement', 'optimize'] },
  ];
  const report = coverageReport(agents);
  assert.deepEqual(report.layers.backend.agents, ['b1', 'b2']);
  assert.deepEqual(report.layers.backend.taskKinds, ['implement', 'optimize', 'refactor']);
});

test('coverageReport reports stack layers with no agent as gaps', () => {
  const agents = [
    { name: 'b1', layer: 'backend', capabilities: ['api'], task_kinds: ['implement'] },
  ];
  const report = coverageReport(agents);
  assert.ok(report.gaps.includes('frontend'));
  assert.ok(!report.gaps.includes('backend'));
  assert.ok(!report.gaps.includes('orchestration')); // cross-cutting is never a gap
});

test('coverageReport on an empty registry makes every stack layer a gap', () => {
  const report = coverageReport([]);
  assert.deepEqual([...report.gaps].sort(), [...stackLayers()].sort());
  assert.deepEqual(report.crossCutting, ['orchestration', 'review']);
});
