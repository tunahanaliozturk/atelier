import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const expected = ['orchestrate', 'plan', 'status', 'crew', 'resume', 'retry', 'next', 'report'];

test('every command exists with a description and a non-empty body', () => {
  for (const name of expected) {
    const path = join('commands', `${name}.md`);
    assert.ok(existsSync(path), `missing ${path}`);
    const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
    assert.ok(data.description && data.description.length > 0, `${name}: missing description`);
    assert.ok(body.trim().length > 0, `${name}: empty body`);
  }
});

test('orchestrate references the user-gate and capability routing', () => {
  const body = readFileSync(join('commands', 'orchestrate.md'), 'utf8');
  assert.match(body, /capability-routing/);
  assert.match(body, /approval/i);
});
