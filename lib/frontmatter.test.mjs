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

test('throws a TypeError when the input is not a string', () => {
  assert.throws(() => parseFrontmatter(null), TypeError);
});

test('skips comment and blank lines inside the frontmatter block', () => {
  const { data } = parseFrontmatter('---\n# a comment\n\nname: lead\n---\n');
  assert.deepEqual(data, { name: 'lead' });
});

test('keeps colons in a scalar value (only the first colon splits)', () => {
  const { data } = parseFrontmatter('---\nhomepage: https://example.com\n---\n');
  assert.equal(data.homepage, 'https://example.com');
});
