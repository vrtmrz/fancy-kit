import { SecretStoreError } from "./errors.js";

// Unlike $, this end assertion also rejects a final line terminator.
const secretNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?![\s\S])/;

/**
 * Validates a portable name without changing it.
 *
 * Names contain 1–64 ASCII characters matching `[a-z0-9]+(?:-[a-z0-9]+)*`.
 * Uppercase letters, separators other than single internal dashes, whitespace,
 * paths, and URI references are rejected. There is no decoding or normalisation.
 *
 * @param name - The complete name to validate.
 * @throws {@link SecretStoreError} with code `invalid-name` for an invalid name,
 * including non-string input from an untyped caller. The input is not echoed.
 */
export function validateSecretName(name: string): void {
  if (
    typeof name !== "string"
    || name.length < 1
    || name.length > 64
    || !secretNamePattern.test(name)
  ) {
    throw new SecretStoreError("invalid-name");
  }
}

/** Validates strings without relying on post-ES2022 Unicode helpers. */
export function validateSecretValue(value: string): void {
  if (typeof value !== "string") {
    throw new SecretStoreError("invalid-value");
  }
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new SecretStoreError("invalid-value");
      }
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new SecretStoreError("invalid-value");
    }
  }
}
