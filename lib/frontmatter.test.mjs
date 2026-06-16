import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './frontmatter.mjs';

test('parses scalar and inline-array fields and returns the body', () => {
  const text = '---\nname: lead\ncapabilities: [a, b]\n---\nbody line\n';
  const { data, body } = parseFrontmatter(text);
  assert.equal(data.name, 'lead');
  assert.deepEqual(data.capabilities, ['a', 'b']);
  assert.equal(body.trim(), 'body line');
});

test('strips surrounding quotes from a scalar value', () => {
  const { data } = parseFrontmatter('---\ndescription: "hello world"\n---\n');
  assert.equal(data.description, 'hello world');
});

test('returns an empty array for an empty inline array', () => {
  const { data } = parseFrontmatter('---\ntags: []\n---\n');
  assert.deepEqual(data.tags, []);
});

test('throws when the frontmatter block is missing', () => {
  assert.throws(() => parseFrontmatter('no frontmatter here'), /malformed frontmatter/i);
});
