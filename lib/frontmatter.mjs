// Minimal frontmatter parser for Atelier markdown files.
// Supports scalar values and single-line inline arrays: key: [a, b, c].
// Values may be wrapped in single or double quotes. No nested objects, no
// multi-line scalars (keep authored frontmatter on one line per key).
// Array items are split on commas, so an individual array item must not
// contain a comma (the registry only uses simple token arrays like
// [dotnet, api]). For a scalar value, only the first colon separates the key
// from the value, so a value may itself contain colons (for example a URL).

export function parseFrontmatter(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseFrontmatter expects a string.');
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) {
    throw new Error('Missing or malformed frontmatter block.');
  }
  const [, block, body] = match;
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) {
      throw new Error(`Malformed frontmatter line (no colon): ${rawLine}`);
    }
    const key = line.slice(0, sep).trim();
    data[key] = parseValue(line.slice(sep + 1).trim());
  }
  return { data, body };
}

function parseValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((item) => stripQuotes(item.trim()));
  }
  return stripQuotes(value);
}

function stripQuotes(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
