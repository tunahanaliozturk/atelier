import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('session-start prints the registry summary including the lead', () => {
  const out = execFileSync('node', ['hooks/session-start.mjs'], { encoding: 'utf8' });
  assert.match(out, /Atelier crew \(capability registry\)/);
  assert.match(out, /lead \[orchestration\]/);
});
