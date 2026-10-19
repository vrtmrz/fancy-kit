/**
 * Stable failure categories for local value storage.
 *
 * Invalid input uses `invalid-key` or `invalid-value`. Missing capabilities
 * use `unavailable`; recognised platform permission and quota failures use
 * `access-denied` and `quota-exceeded`. Malformed stored results use
 * `invalid-data`; other failures use `operation-failed`.
 */
export type LocalStorageErrorCode =
  | "invalid-key"
  | "invalid-value"
  | "unavailable"
  | "access-denied"
  | "quota-exceeded"
  | "invalid-data"
  | "operation-failed";

const errorMessages: Readonly<Record<LocalStorageErrorCode, string>> = {
  "invalid-key": "The local storage key is invalid.",
  "invalid-value": "The local storage value is invalid.",
  unavailable: "The local storage backend is unavailable.",
  "access-denied": "Access to the local storage backend was denied.",
  "quota-exceeded": "The local storage quota was exceeded.",
  "invalid-data": "The local storage data is invalid.",
  "operation-failed": "The local storage operation failed.",
};

/**
 * A local-storage failure containing only a recognised code and fixed message.
 *
 * Adapters should construct this error at external boundaries instead of
 * attaching upstream messages, causes, names, or stored data. Branch on
 * {@link LocalStorageError.code} rather than its descriptive message.
 */
export class LocalStorageError extends Error {
  /** The stable failure category. */
  readonly code: LocalStorageErrorCode;

  /**
   * Creates a fixed-message error without accepting a message or cause.
   *
   * An unrecognised code supplied by an untyped caller becomes
   * `operation-failed` without stringifying the input.
   *
   * @param code - A recognised local-storage failure category.
   */
  constructor(code: LocalStorageErrorCode) {
    const safeCode = isLocalStorageErrorCode(code) ? code : "operation-failed";
    super(errorMessages[safeCode]);
    this.name = "LocalStorageError";
    this.code = safeCode;
  }
}

/**
 * Reconstructs a fixed local-storage error from an untrusted failure value.
 *
 * Recognised local-storage errors retain only their recognised code. DOM-style
 * `SecurityError` and `QuotaExceededError` names map to their stable public
 * categories; all other values become `operation-failed`. Messages, causes,
 * and arbitrary object properties are never copied.
 *
 * This helper is exported for internal adapters and is not re-exported by the
 * package root.
 *
 * @param error - An arbitrary value thrown by a backend or host getter.
 */
export function sanitiseLocalStorageError(error: unknown): LocalStorageError {
  try {
    if (error instanceof LocalStorageError) {
      let code: unknown;
      try {
        code = (error as LocalStorageError).code;
      } catch {
        return new LocalStorageError("operation-failed");
      }
      return new LocalStorageError(
        isLocalStorageErrorCode(code) ? code : "operation-failed",
      );
    }
  } catch {
    // A proxy can throw while instanceof inspects its prototype chain.
    return new LocalStorageError("operation-failed");
  }

  let name: unknown;
  try {
    if ((typeof error === "object" && error !== null) || typeof error === "function") {
      name = (error as { readonly name?: unknown }).name;
    }
  } catch {
    // Do not allow a hostile name getter to escape this sanitiser.
    return new LocalStorageError("operation-failed");
  }

  if (name === "SecurityError") {
    return new LocalStorageError("access-denied");
  }
  if (name === "QuotaExceededError") {
    return new LocalStorageError("quota-exceeded");
  }
  return new LocalStorageError("operation-failed");
}

function isLocalStorageErrorCode(code: unknown): code is LocalStorageErrorCode {
  return typeof code === "string"
    && Object.prototype.hasOwnProperty.call(errorMessages, code);
}
