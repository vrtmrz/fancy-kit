import {
  createAgeEncryptor as createByteAgeEncryptor,
  decryptAgeValue,
  encodeAgeValue,
  MAX_CIPHERTEXT_BYTES,
} from '../../packages/secret-store-node/dist/internal/age-codec.js';

export { decryptAgeValue, MAX_CIPHERTEXT_BYTES };

/**
 * Adapts the internal byte encryptor to the string signature used by feasibility tests.
 * @param {readonly string[]} recipients - Native X25519 recipients.
 * @returns {(value: string) => Promise<Uint8Array>} The test encryptor.
 */
export function createAgeEncryptor(recipients) {
  const encryptBytes = createByteAgeEncryptor(recipients);
  return async (value) => encryptBytes(encodeAgeValue(value));
}
