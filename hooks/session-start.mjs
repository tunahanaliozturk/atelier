import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRegistry, formatRegistry } from '../lib/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const agentsDir = join(here, '..', 'agents');

try {
  process.stdout.write(formatRegistry(readRegistry(agentsDir)) + '\n');
} catch (err) {
  // Surfacing the registry is best-effort and must never break the session.
  process.stdout.write(`Atelier: registry load skipped (${err.message}).\n`);
}
