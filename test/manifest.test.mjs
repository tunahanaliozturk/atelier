import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plugin = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
const market = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'));

test('plugin.json has the required fields', () => {
  for (const k of ['name', 'description', 'version', 'license']) {
    assert.ok(plugin[k], `missing ${k}`);
  }
  assert.equal(plugin.name, 'atelier');
});

test('marketplace lists the atelier plugin at the same version', () => {
  const entry = market.plugins.find((p) => p.name === 'atelier');
  assert.ok(entry, 'atelier not listed in marketplace');
  assert.equal(entry.version, plugin.version);
  assert.equal(entry.source, './');
});
