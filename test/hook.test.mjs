import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve the script absolutely so the test does not depend on the runner's cwd.
const script = fileURLToPath(new URL('../hooks/session-start.mjs', import.meta.url));

test('session-start prints the registry summary including the lead', () => {
  const out = execFileSync('node', [script], { encoding: 'utf8' });
  assert.match(out, /Atelier crew \(capability registry\)/);
  assert.match(out, /lead \[orchestration\]/);
});
