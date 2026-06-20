import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRegistry } from '../lib/registry.mjs';

const agents = readRegistry('agents');
const byName = Object.fromEntries(agents.map((a) => [a.name, a]));

test('the four core agents are registered and valid', () => {
  for (const name of ['lead', 'planner', 'spec-reviewer', 'code-quality-reviewer']) {
    assert.ok(byName[name], `missing agent ${name}`);
  }
});

test('the lead agent is in the orchestration layer', () => {
  assert.equal(byName.lead.layer, 'orchestration');
  assert.ok(byName.lead.task_kinds.length > 0);
});

test('the new specialist agents are registered in their layers', () => {
  assert.equal(byName['qa-engineer'].layer, 'qa');
  assert.equal(byName['mobile-engineer'].layer, 'mobile');
  assert.equal(byName['ml-engineer'].layer, 'ml');
});
