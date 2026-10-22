import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { generateIdentity, identityToRecipient } from 'age-encryption';
import { createAgeFileSecretReader, createAgeFileSecretStore } from '@vrtmrz/secret-store-node/age';
import { createAgeEncryptor, decryptAgeValue } from './codec.mjs';
import { valueCases } from './cases.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const binaries = resolve(repository, '_testdata/age-interop', `${process.platform}-${process.arch}`);
const tools = [
  { name: 'age', version: 'v1.3.2', executable: process.env.AGE_INTEROP_BIN ?? join(binaries, 'age') },
  { name: 'rage', version: 'rage 0.12.1', executable: process.env.RAGE_INTEROP_BIN ?? join(binaries, 'rage') },
];

function run(executable, args, input) {
  const result = spawnSync(executable, args, { input, encoding: null, maxBuffer: 2 * 1024 * 1024, timeout: 30_000 });
  // Do not print captured bytes, identities, or an upstream error on failure.
  assert.ok(!result.error && result.status === 0, 'Pinned interoperability tool must complete successfully');
  return result.stdout;
}

for (const tool of tools) {
  test(`${tool.name}: pinned version and bidirectional binary interoperability`, async (t) => {
    assert.equal(run(tool.executable, ['--version']).toString().trim(), tool.version);
    const directory = await mkdtemp(join(tmpdir(), 'fancy-kit-age-interop-'));
    try {
      const nativeIdentityPath = join(directory, 'native-identity.txt');
      run(`${tool.executable}-keygen`, ['-o', nativeIdentityPath]);
      const nativeIdentity = (await readFile(nativeIdentityPath, 'utf8')).split(/\r?\n/).find((line) => line.startsWith('AGE-SECRET-KEY-1'));
      assert.ok(nativeIdentity, 'Native key generation must supply an X25519 identity');
      const nodeIdentity = await generateIdentity();
      const nodeIdentityPath = join(directory, 'node-identity.txt');
      await writeFile(nodeIdentityPath, `${nodeIdentity}\n`, { flag: 'wx', mode: 0o600 });
      const identities = [nativeIdentity, nodeIdentity];
      const recipients = await Promise.all(identities.map(identityToRecipient));
      const encrypt = createAgeEncryptor(recipients);
      for (const [label, value] of valueCases) {
        await t.test(label, async () => {
          const expected = Buffer.from(value, 'utf8');
          const nodeCiphertext = await encrypt(value);
          for (const path of [nativeIdentityPath, nodeIdentityPath]) {
            assert.ok(run(tool.executable, ['--decrypt', '--identity', path], nodeCiphertext).equals(expected), 'Native decryption must preserve exact bytes');
          }
          const nativeCiphertext = run(tool.executable, recipients.flatMap((recipient) => ['--recipient', recipient]), expected);
          for (const identity of identities) {
            assert.ok(await decryptAgeValue(nativeCiphertext, async () => [identity]) === value, 'Codec decryption must preserve exact text');
          }
        });
      }
      await t.test('public file store interoperates with native ciphertext files', async () => {
        const rootPath = join(directory, 'store');
        await mkdir(rootPath, { mode: 0o700 });
        const identityProvider = async () => [nativeIdentity];
        const store = await createAgeFileSecretStore({ rootPath, recipients, identityProvider });
        const value = '\ufeffsynthetic\0file-value\n';
        await store.setValue('node-entry', value);
        const nodeCiphertext = await readFile(join(rootPath, 'secret-node-entry.age'));
        assert.ok(run(tool.executable, ['--decrypt', '--identity', nativeIdentityPath], nodeCiphertext).equals(Buffer.from(value, 'utf8')));
        const nativeCiphertext = run(tool.executable, ['--recipient', recipients[0]], Buffer.from(value, 'utf8'));
        await writeFile(join(rootPath, 'secret-native-entry.age'), nativeCiphertext, { flag: 'wx', mode: 0o600 });
        const reader = await createAgeFileSecretReader({ rootPath, identityProvider });
        assert.equal(await reader.getValue('native-entry'), value);
      });
      await t.test('authenticated invalid text from the native tool is rejected', async () => {
        const ciphertext = run(tool.executable, ['--recipient', recipients[0]], Buffer.from([0xff]));
        await assert.rejects(decryptAgeValue(ciphertext, async () => [nativeIdentity]), { code: 'invalid-data' });
      });
      await t.test('native tools reject a damaged codec ciphertext', async () => {
        const ciphertext = await encrypt('synthetic-integrity-check');
        ciphertext[ciphertext.length - 1] ^= 1;
        const result = spawnSync(tool.executable, ['--decrypt', '--identity', nativeIdentityPath], { input: ciphertext, encoding: null, maxBuffer: 2 * 1024 * 1024, timeout: 30_000 });
        assert.ok(!result.error && result.status !== 0, 'Native authentication must reject tampering');
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
