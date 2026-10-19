import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const platform = `${process.platform}-${process.arch}`;
const manifest = JSON.parse(await readFile(resolve(here, 'tools.json'), 'utf8'));
const tools = manifest[platform];
if (!tools) throw new Error('No pinned interoperability tools for this platform; supply explicit binary paths instead.');
const destination = resolve(here, '../../_testdata/age-interop', platform);
await mkdir(destination, { recursive: true });
for (const tool of tools) {
  const response = await fetch(tool.url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Unable to download pinned ${tool.name} release (${response.status}).`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(archive).digest('hex') !== tool.sha256) throw new Error(`Checksum mismatch for ${tool.name}.`);
  const listing = spawnSync('tar', ['-tzf', '-'], { input: archive, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 30_000 });
  if (listing.error || listing.status !== 0) throw new Error(`Unable to inspect ${tool.name} archive.`);
  for (const binary of [tool.name, `${tool.name}-keygen`]) {
    const entries = listing.stdout.trim().split('\n').filter((entry) => entry.split('/').at(-1) === binary);
    if (entries.length !== 1) throw new Error(`Expected exactly one ${binary} in the pinned archive.`);
    // Extract only an explicitly selected executable to stdout, never paths from
    // the archive into the repository. The complete archive was checked above.
    const extraction = spawnSync('tar', ['-xzOf', '-', '--', entries[0]], { input: archive, maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
    if (extraction.error || extraction.status !== 0) throw new Error(`Unable to extract ${binary}.`);
    await writeFile(resolve(destination, binary), extraction.stdout, { mode: 0o755 });
  }
  console.log(`Installed checksum-verified ${tool.name} for ${platform}.`);
}
