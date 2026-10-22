import type { ValueSerializer } from "@vrtmrz/value-store";
import {
  decryptWithEphemeralSalt,
  encryptWithEphemeralSalt,
  HKDF_SALTED_ENCRYPTED_PREFIX,
} from "octagonal-wheels/encryption/hkdf";

/** Supplies a passphrase without prescribing its source or persisting it. */
export type PassphraseProvider = () => string | Promise<string>;

/**
 * Creates an example serializer using OW's salted HKDF and AES-GCM format.
 *
 * Supply this pair explicitly to a value or secret store. The caller owns the
 * provider and key provisioning. The example binds the logical key inside the
 * authenticated payload and JSON-encodes strings before OW's UTF-8 boundary,
 * preserving empty strings, BOMs, and lone UTF-16 surrogates. OW includes the
 * decryption salt in its ciphertext and manages its own derivation cache.
 * This example neither logs values nor persists a passphrase.
 *
 * @param getPassphrase - Called for each transform; no source is discovered.
 * @returns A paired serializer structurally compatible with both store families.
 */
export function createOwHkdfSerializer(getPassphrase: PassphraseProvider): ValueSerializer {
  if (typeof getPassphrase !== "function") throw new Error("The passphrase provider is invalid.");

  async function passphrase(): Promise<string> {
    const value = await getPassphrase();
    if (typeof value !== "string" || value.length === 0) throw new Error();
    for (let index = 0; index < value.length; index++) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(++index);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error();
      } else if (unit >= 0xdc00 && unit <= 0xdfff) throw new Error();
    }
    return value;
  }

  return {
    async serialize(key, value) {
      try {
        if (typeof key !== "string" || typeof value !== "string") throw new Error();
        // Encoding the primitive strings separately avoids inherited array toJSON hooks.
        const payload = `[${JSON.stringify(key)},${JSON.stringify(value)}]`;
        return await encryptWithEphemeralSalt(payload, await passphrase());
      } catch {
        throw new Error("The value could not be serialised.");
      }
    },
    async deserialize(key, value) {
      try {
        if (typeof key !== "string" || typeof value !== "string" || !value.startsWith(HKDF_SALTED_ENCRYPTED_PREFIX)) {
          throw new Error();
        }
        const encoded = value.slice(HKDF_SALTED_ENCRYPTED_PREFIX.length);
        // Reject malformed Base64 before invoking OW's logging decoder helpers.
        if (encoded.length < 124 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
          throw new Error();
        }
        const payload: unknown = JSON.parse(await decryptWithEphemeralSalt(value, await passphrase()));
        if (!Array.isArray(payload) || payload.length !== 2 || payload[0] !== key || typeof payload[1] !== "string") {
          throw new Error();
        }
        return payload[1];
      } catch {
        throw new Error("The value could not be deserialised.");
      }
    },
  };
}
