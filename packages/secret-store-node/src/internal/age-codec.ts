import { Decrypter, Encrypter } from 'age-encryption';
import { ValueStoreError } from '@vrtmrz/value-store';
import type { AgeIdentityProvider } from '../age-types.js';

/** Inclusive UTF-8 byte limit for one secret value. */
export const MAX_PLAINTEXT_BYTES = 65_536;

/** Inclusive ciphertext byte limit, checked before identity acquisition. */
export const MAX_CIPHERTEXT_BYTES = 1_048_576;

const recipientPattern = /^age1[0-9a-z]{58}(?![\s\S])/u;
const identityPattern = /^AGE-SECRET-KEY-1[0-9A-Z]{58}(?![\s\S])/u;

type ValueStoreErrorCode = ConstructorParameters<typeof ValueStoreError>[0];

function fail(code: ValueStoreErrorCode): never {
  throw new ValueStoreError(code);
}

/**
 * Encodes one well-formed string within the age plaintext limit.
 *
 * The UTF-16 length is checked before encoding because every code unit in a
 * well-formed string contributes at least one UTF-8 byte. The encoded length
 * is then checked to enforce the byte limit for multibyte characters.
 *
 * @param value - The value to encode.
 * @returns UTF-8 bytes for the value.
 * @throws {@link ValueStoreError} with code `invalid-value` for non-strings,
 *   unpaired surrogates, or values above {@link MAX_PLAINTEXT_BYTES} bytes.
 */
export function encodeAgeValue(value: string): Uint8Array {
  if (typeof value !== 'string' || /[\uD800-\uDFFF]/u.test(value)) fail('invalid-value');
  // Reject before allocating an encoding of an arbitrarily large string.
  if (value.length > MAX_PLAINTEXT_BYTES) fail('invalid-value');
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength > MAX_PLAINTEXT_BYTES) fail('invalid-value');
  return bytes;
}

/**
 * Creates a byte encryptor with a copied, non-empty native X25519 recipient list.
 *
 * Invalid recipient policy rejects at construction. Each call encrypts the
 * supplied UTF-8 bytes as binary age and rejects oversized plaintext without
 * truncation. The function never acquires or retains identities.
 *
 * @param recipients - Native X25519 recipient strings copied at construction.
 * @returns An encryptor that resolves to binary age ciphertext.
 * @throws {@link ValueStoreError} with code `invalid-value` for an empty,
 *   malformed, or unsupported recipient policy.
 */
export function createAgeEncryptor(
  recipients: readonly string[],
): (plaintext: Uint8Array) => Promise<Uint8Array> {
  if (!Array.isArray(recipients) || recipients.length === 0) fail('invalid-value');
  const copiedRecipients = [...recipients];
  const validate = new Encrypter();
  for (const recipient of copiedRecipients) {
    if (typeof recipient !== 'string' || !recipientPattern.test(recipient)) fail('invalid-value');
    try {
      validate.addRecipient(recipient);
    } catch {
      fail('invalid-value');
    }
  }

  return async (plaintext: Uint8Array): Promise<Uint8Array> => {
    if (!(plaintext instanceof Uint8Array) || plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
      fail('invalid-value');
    }
    try {
      const encrypter = new Encrypter();
      for (const recipient of copiedRecipients) encrypter.addRecipient(recipient);
      const ciphertext = await encrypter.encrypt(plaintext);
      if (ciphertext.byteLength > MAX_CIPHERTEXT_BYTES) fail('operation-failed');
      return ciphertext;
    } catch {
      fail('operation-failed');
    }
  };
}

/**
 * Decrypts bounded ciphertext using identities supplied for this call only.
 *
 * The ciphertext size is checked before invoking the provider. Empty identity
 * sources are unavailable; provider failures are `operation-failed`; malformed
 * identity policy is `invalid-value`. Upstream parse, key-selection, and
 * authentication failures map to `decryption-failed` because age-encryption
 * supplies no stable error codes. Only fully authenticated bytes are decoded;
 * leading BOMs are preserved, and invalid UTF-8 or plaintext above the limit
 * maps to `invalid-data`.
 *
 * @param ciphertext - The already-read binary age ciphertext.
 * @param provideIdentities - Supplies native X25519 identities for this call.
 * @returns The decoded UTF-8 secret value.
 * @throws {@link ValueStoreError} with a fixed failure code for invalid input,
 *   unavailable identities, provider failures, or decryption failures.
 */
export async function decryptAgeValue(
  ciphertext: Uint8Array,
  provideIdentities: AgeIdentityProvider,
): Promise<string> {
  if (!(ciphertext instanceof Uint8Array) || ciphertext.byteLength > MAX_CIPHERTEXT_BYTES) {
    fail('invalid-data');
  }

  let identities: readonly string[];
  try {
    identities = await provideIdentities();
  } catch {
    fail('operation-failed');
  }
  if (!Array.isArray(identities)) fail('invalid-value');
  if (identities.length === 0) fail('unavailable');

  const decrypter = new Decrypter();
  for (const identity of identities) {
    if (typeof identity !== 'string' || !identityPattern.test(identity)) fail('invalid-value');
    try {
      decrypter.addIdentity(identity);
    } catch {
      fail('invalid-value');
    }
  }

  let plaintext: Uint8Array;
  try {
    plaintext = await decrypter.decrypt(ciphertext, 'uint8array');
  } catch {
    fail('decryption-failed');
  }
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) fail('invalid-data');
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(plaintext);
  } catch {
    fail('invalid-data');
  }
}
