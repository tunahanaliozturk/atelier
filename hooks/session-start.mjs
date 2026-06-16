import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRegistry, formatRegistry } from '../lib/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const agentsDir = join(here, '..', 'agents');

try {
  process.stdout.write(formatRegistry(readRegistry(agentsDir)) + '\n');
} catch (err) {
  // Surfacing the registry is best-effort and must never break the session.
  // Use the message when present, but fall back to the raw value for a non-Error throw.
  const reason = err && err.message ? err.message : String(err);
  process.stdout.write(`Atelier: registry load skipped (${reason}).\n`);
}
