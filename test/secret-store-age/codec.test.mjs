import { ValueStoreError } from "@vrtmrz/value-store";
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Decrypter, Encrypter, generateIdentity, identityToRecipient } from 'age-encryption';

import { createAgeEncryptor, decryptAgeValue, MAX_CIPHERTEXT_BYTES } from './codec.mjs';
import { valueCases } from './cases.mjs';

const identities = await Promise.all([generateIdentity(), generateIdentity(), generateIdentity()]);
const recipients = await Promise.all(identities.map(identityToRecipient));
const encrypt = createAgeEncryptor(recipients.slice(0, 2));
const provider = () => Promise.resolve([identities[0]]);
const hasCode = (code) => (error) => error instanceof ValueStoreError && error.code === code && !('cause' in error);

async function encryptBytes(bytes) {
  const encrypter = new Encrypter();
  encrypter.addRecipient(recipients[0]);
  return encrypter.encrypt(bytes);
}

for (const [label, value] of valueCases) {
  test(`preserves ${label} through both recipients`, async () => {
    const ciphertext = await encrypt(value);
    assert.equal(new TextDecoder().decode(ciphertext.subarray(0, 22)), 'age-encryption.org/v1\n');
    for (const identity of identities.slice(0, 2)) {
      assert.ok(await decryptAgeValue(ciphertext, async () => [identity]) === value);
    }
  });
}

test('copies the recipient policy and uses fresh randomness', async () => {
  const policy = [recipients[0]];
  const ownedEncrypt = createAgeEncryptor(policy);
  policy[0] = recipients[2];
  const first = await ownedEncrypt('synthetic-value');
  const second = await ownedEncrypt('synthetic-value');
  assert.ok(!Buffer.from(first).equals(Buffer.from(second)));
  assert.ok(await decryptAgeValue(first, provider) === 'synthetic-value');
  await assert.rejects(decryptAgeValue(first, async () => [identities[2]]), hasCode('decryption-failed'));
});

test('rejects invalid or unsupported recipient policy at construction', () => {
  for (const policy of [[], null, [''], ['ssh-ed25519 synthetic'], ['age1pq1synthetic'], [recipients[0].toUpperCase()], [recipients[0] + '\n'], ['age1' + 'a'.repeat(58)]]) {
    assert.throws(() => createAgeEncryptor(policy), hasCode('invalid-value'));
  }
});

test('rejects lone surrogates, non-strings, and byte-limit overflow', async () => {
  for (const value of ['\uD800', '\uDC00', 'a\uD800b', 1, null, 'x'.repeat(65537), '🔐'.repeat(16384) + 'x']) {
    await assert.rejects(encrypt(value), hasCode('invalid-value'));
  }
});

test('requests identities once per decryption without caching', async () => {
  const ciphertext = await encrypt('synthetic-value');
  let calls = 0;
  const changing = async () => [identities[calls++ === 0 ? 0 : 2]];
  await decryptAgeValue(ciphertext, changing);
  await assert.rejects(decryptAgeValue(ciphertext, changing), hasCode('decryption-failed'));
  assert.equal(calls, 2);
});

test('rejects oversized or non-byte ciphertext before acquiring identities', async () => {
  let calls = 0;
  for (const input of [new Uint8Array(MAX_CIPHERTEXT_BYTES + 1), 'ciphertext', null]) {
    await assert.rejects(decryptAgeValue(input, async () => { calls++; return identities; }), hasCode('invalid-data'));
  }
  assert.equal(calls, 0);
  await assert.rejects(decryptAgeValue(new Uint8Array(MAX_CIPHERTEXT_BYTES), async () => { calls++; return identities; }), hasCode('decryption-failed'));
  assert.equal(calls, 1);
});

test('rejects the validly encoded all-zero X25519 public point', async () => {
  const lowOrderRecipient = 'age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5cu47z';
  await assert.rejects(createAgeEncryptor([lowOrderRecipient])('synthetic-value'), hasCode('operation-failed'));
});

test('distinguishes unavailable keys from invalid policy and provider failure', async () => {
  const ciphertext = await encrypt('synthetic-value');
  await assert.rejects(decryptAgeValue(ciphertext, async () => []), hasCode('unavailable'));
  for (const policy of [undefined, ['AGE-SECRET-KEY-PQ-1synthetic'], ['bad-key'], [identities[0] + '\n']]) {
    await assert.rejects(decryptAgeValue(ciphertext, async () => policy), hasCode('invalid-value'));
  }
  await assert.rejects(decryptAgeValue(ciphertext, async () => { throw new Error('SENTINEL-PRIVATE-IDENTITY'); }), (error) => {
    assert.ok(hasCode('operation-failed')(error));
    assert.ok(!`${error.stack}${JSON.stringify(error)}`.includes('SENTINEL'));
    return true;
  });
});

test('rejects wrong keys, malformed headers, tampering, truncation, and trailing data', async () => {
  const ciphertext = await encrypt('x'.repeat(65536));
  await assert.rejects(decryptAgeValue(ciphertext, async () => [identities[2]]), hasCode('decryption-failed'));
  const headerTamper = ciphertext.slice();
  headerTamper[0] ^= 1;
  const payloadTamper = ciphertext.slice();
  payloadTamper[payloadTamper.length - 1] ^= 1;
  for (const input of [new Uint8Array(), headerTamper, payloadTamper, ciphertext.subarray(0, 25), ciphertext.subarray(0, -1), new Uint8Array([...ciphertext, 0])]) {
    await assert.rejects(decryptAgeValue(input, provider), hasCode('decryption-failed'));
  }
});

test('rejects authenticated invalid UTF-8 and oversized plaintext', async () => {
  for (const bytes of [new Uint8Array([0xff]), new Uint8Array([0xc0, 0xaf]), new Uint8Array([0xed, 0xa0, 0x80]), new Uint8Array([0xe2, 0x82]), new Uint8Array(65537)]) {
    await assert.rejects(decryptAgeValue(await encryptBytes(bytes), provider), hasCode('invalid-data'));
  }
});

test('retains evidence that upstream text mode loses the BOM and replaces invalid UTF-8', async () => {
  const decrypter = new Decrypter();
  decrypter.addIdentity(identities[0]);
  assert.equal(await decrypter.decrypt(await encryptBytes(new Uint8Array([0xef, 0xbb, 0xbf, 0x61])), 'text'), 'a');
  assert.equal(await decrypter.decrypt(await encryptBytes(new Uint8Array([0xff])), 'text'), '\uFFFD');
});
