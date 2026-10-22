/** Stable failure categories shared by value and secret stores. */
export type ValueStoreErrorCode =
  | "invalid-key"
  | "invalid-name"
  | "invalid-value"
  | "unavailable"
  | "access-denied"
  | "quota-exceeded"
  | "decryption-failed"
  | "invalid-data"
  | "operation-failed";

const errorMessages: Readonly<Record<ValueStoreErrorCode, string>> = {
  "invalid-key": "The value store key is invalid.",
  "invalid-name": "The secret name is invalid.",
  "invalid-value": "The value is invalid or unsupported.",
  unavailable: "A required store or resource is unavailable.",
  "access-denied": "Access to the store was denied.",
  "quota-exceeded": "The storage quota was exceeded.",
  "decryption-failed": "The secret could not be decrypted.",
  "invalid-data": "The stored data is invalid.",
  "operation-failed": "The storage operation failed.",
};

/**
 * A store failure containing only a recognised code and fixed message.
 * Messages and codes never include upstream details or caller-supplied values.
 */
export class ValueStoreError extends Error {
  /** The stable failure category. */
  readonly code: ValueStoreErrorCode;

  /**
   * Creates a fixed-message error without accepting a message or cause.
   * An unrecognised code supplied by an untyped caller becomes
   * `operation-failed` without stringifying the input.
   * @param code - A recognised value-store failure category.
   */
  constructor(code: ValueStoreErrorCode) {
    const safeCode = isValueStoreErrorCode(code) ? code : "operation-failed";
    super(errorMessages[safeCode]);
    this.name = "ValueStoreError";
    this.code = safeCode;
  }
}

/**
 * Reconstructs a fixed value-store error from an untrusted failure value.
 * Direct ValueStoreError instances retain only an own data-property code;
 * accessors are never invoked. DOM-style
 * SecurityError and QuotaExceededError names map to their stable categories;
 * all other values become `operation-failed`. Messages, causes, and arbitrary
 * properties are never copied.
 *
 * @param error - An arbitrary value thrown by a backend or host getter.
 */
export function sanitiseValueStoreError(error: unknown): ValueStoreError {
  try {
    if (typeof error === "object" && error !== null
      && Object.getPrototypeOf(error) === ValueStoreError.prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(error, "code");
      const code: unknown = descriptor !== undefined && Object.hasOwn(descriptor, "value")
        ? descriptor.value
        : undefined;
      return new ValueStoreError(
        isValueStoreErrorCode(code) ? code : "operation-failed",
      );
    }
  } catch {
    // A proxy can throw during prototype or property-descriptor inspection.
    return new ValueStoreError("operation-failed");
  }

  let name: unknown;
  try {
    if ((typeof error === "object" && error !== null) || typeof error === "function") {
      name = (error as { readonly name?: unknown }).name;
    }
  } catch {
    // Do not allow a hostile name getter to escape this sanitiser.
    return new ValueStoreError("operation-failed");
  }

  if (name === "SecurityError") {
    return new ValueStoreError("access-denied");
  }
  if (name === "QuotaExceededError") {
    return new ValueStoreError("quota-exceeded");
  }
  return new ValueStoreError("operation-failed");
}

function isValueStoreErrorCode(code: unknown): code is ValueStoreErrorCode {
  return typeof code === "string"
    && Object.prototype.hasOwnProperty.call(errorMessages, code);
}
