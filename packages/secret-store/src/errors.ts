/**
 * Stable failure categories for secret adapters.
 *
 * `invalid-name` and `invalid-value` identify rejected input. `unavailable`
 * identifies a missing API, root, service, or identity source. `access-denied`
 * requires a reliable platform status. `decryption-failed` may mean a wrong
 * identity or damaged ciphertext; `invalid-data` requires a positively identified
 * format or encoding violation. Use `operation-failed` when no narrower category
 * is established, including an uncertain mutation outcome. Absence is `null`,
 * not an error code.
 */
export type SecretStoreErrorCode =
  | "invalid-name"
  | "invalid-value"
  | "unavailable"
  | "access-denied"
  | "decryption-failed"
  | "invalid-data"
  | "operation-failed";

const errorMessages: Record<SecretStoreErrorCode, string> = {
  "invalid-name": "The secret name is invalid.",
  "invalid-value": "The secret value is invalid or unsupported.",
  "unavailable": "The secret store or a required resource is unavailable.",
  "access-denied": "Access to the secret store was denied.",
  "decryption-failed": "The secret could not be decrypted.",
  "invalid-data": "The stored secret data is invalid.",
  "operation-failed": "The secret store operation failed.",
};

/**
 * A secret-store failure containing only a recognised code and fixed message.
 *
 * Adapters must construct this error at external boundaries instead of attaching
 * upstream messages, causes, names, paths, or payloads. This class does not catch
 * or sanitise an upstream error automatically. Its message wording is descriptive;
 * consumers should branch on {@link SecretStoreError.code}.
 */
export class SecretStoreError extends Error {
  /** The failure category; it never contains caller-supplied secret material. */
  readonly code: SecretStoreErrorCode;

  /**
   * Creates a fixed-message error without accepting a message or cause.
   *
   * Unrecognised codes supplied by untyped callers become `operation-failed`
   * without stringifying the input.
   * @param code - A recognised failure category.
   */
  constructor(code: SecretStoreErrorCode) {
    const safeCode = typeof code === "string" && Object.hasOwn(errorMessages, code)
      ? code
      : "operation-failed";
    super(errorMessages[safeCode]);
    this.name = "SecretStoreError";
    this.code = safeCode;
  }
}

/**
 * Rebuilds a known secret-store failure with its fixed message, or maps any
 * unrecognised or hostile thrown value to `operation-failed`.
 *
 * This helper is intentionally internal: adapter and callback failures must not
 * leak arbitrary messages, causes, or payloads across the neutral boundary.
 */
export function sanitiseSecretStoreError(error: unknown): SecretStoreError {
  try {
    if (typeof error === "object" && error !== null) {
      if (Object.getPrototypeOf(error) === SecretStoreError.prototype) {
        const descriptor = Object.getOwnPropertyDescriptor(error, "code");
        const code = descriptor !== undefined && Object.hasOwn(descriptor, "value")
          ? descriptor.value
          : undefined;
        if (typeof code === "string" && Object.hasOwn(errorMessages, code)) {
          return new SecretStoreError(code as SecretStoreErrorCode);
        }
      }
    }
  } catch {
    // Proxies can throw from prototype and property-descriptor inspection.
  }
  return new SecretStoreError("operation-failed");
}
