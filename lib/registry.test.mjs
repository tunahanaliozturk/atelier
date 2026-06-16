import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry, formatRegistry } from './registry.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(
    join(dir, 'lead.md'),
    '---\nname: lead\ndescription: Coordinates the crew.\ncapabilities: [orchestration]\nlayer: orchestration\ntask_kinds: [coordinate]\n---\nbody\n',
  );
  return dir;
}

test('reads every agent and exposes its capability fields', () => {
  const agents = readRegistry(fixture());
  assert.equal(agents.length, 1);
  assert.equal(agents[0].name, 'lead');
  assert.deepEqual(agents[0].capabilities, ['orchestration']);
  assert.equal(agents[0].layer, 'orchestration');
  assert.deepEqual(agents[0].task_kinds, ['coordinate']);
  assert.equal(agents[0].file, 'lead.md');
});

test('throws when a required field is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(join(dir, 'bad.md'), '---\nname: bad\n---\nbody\n');
  assert.throws(() => readRegistry(dir), /missing required field/i);
});

test('throws when capabilities is not a list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(
    join(dir, 'bad.md'),
    '---\nname: bad\ndescription: x\ncapabilities: dotnet\nlayer: backend\ntask_kinds: [implement]\n---\nbody\n',
  );
  assert.throws(() => readRegistry(dir), /must be a list/i);
});

test('formatRegistry lists each agent on its own line', () => {
  const agents = readRegistry(fixture());
  const out = formatRegistry(agents);
  assert.match(out, /Atelier crew \(capability registry\)/);
  assert.match(out, /lead \[orchestration\]/);
});

test('an empty agents directory yields an empty registry and the empty-state summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  assert.deepEqual(readRegistry(dir), []);
  assert.equal(formatRegistry([]), 'Atelier: no agents registered.');
});

test('throws when task_kinds is not a list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-reg-'));
  writeFileSync(
    join(dir, 'bad.md'),
    '---\nname: bad\ndescription: x\ncapabilities: [api]\nlayer: backend\ntask_kinds: implement\n---\nbody\n',
  );
  assert.throws(() => readRegistry(dir), /must be a list/i);
});
