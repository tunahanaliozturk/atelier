import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const expected = [
  'reviewing-plans',
  'capability-routing',
  'dispatching-agents',
  'verifying-task-output',
  'mission-tracking',
  'writing-plans',
];

test('every expected skill exists with name and description frontmatter', () => {
  for (const name of expected) {
    const path = join('skills', name, 'SKILL.md');
    assert.ok(existsSync(path), `missing ${path}`);
    const { data } = parseFrontmatter(readFileSync(path, 'utf8'));
    assert.equal(data.name, name, `${name}: frontmatter name must match folder`);
    assert.ok(data.description && data.description.length > 0, `${name}: missing description`);
  }
});

test('no skill folder is missing a SKILL.md', () => {
  for (const entry of readdirSync('skills', { withFileTypes: true })) {
    if (entry.isDirectory()) {
      assert.ok(existsSync(join('skills', entry.name, 'SKILL.md')), `${entry.name}: no SKILL.md`);
    }
  }
});
