import type { ValueBatchWriter, ValueDeleter, ValueStore, ValueStoreDisposer, ValueStoreOptions } from "./contracts.js";
import { ValueStoreError, sanitiseValueStoreError } from "./errors.js";
import { createEnhancedValueStore } from "./enhanced-store.js";
import { validateValuePrefix } from "./validation.js";

/**
 * The synchronous raw string methods used by the Web Storage adapter.
 *
 * @remarks
 * The factory captures each method once and calls it with the supplied object
 * as its receiver. This boundary can also be implemented by a test double; the
 * adapter does not look up `window`, `globalThis`, or another storage global.
 */
export interface WebStorageAccess {
  /**
   * Reads one exact raw physical key synchronously.
   * @param key - Complete physical key, already including the adapter's literal prefix.
   * @returns The exact stored string, including an empty string, or null only for absence.
   * @throws An observed platform read failure, sanitised by the adapter.
   */
  getItem(key: string): string | null;
  /**
   * Synchronously replaces one raw physical value, preserving an empty string as data.
   * @param key - Complete physical key, already including the adapter's literal prefix.
   * @param value - Exact serialised string; this boundary performs no JSON conversion.
   * @throws An observed platform write failure, sanitised by the adapter.
   */
  setItem(key: string, value: string): void;
  /**
   * Synchronously removes one physical key; an absent key needs no mutation.
   * @param key - Complete physical key, already including the adapter's literal prefix.
   * @throws An observed platform removal failure, sanitised by the adapter.
   */
  removeItem(key: string): void;
}

/** Options for the explicitly injected Web Storage adapter. */
export interface WebStorageValueStoreOptions extends ValueStoreOptions {
  /** Complete literal prefix prepended verbatim to raw keys; empty is allowed. */
  prefix: string;
}

/**
 * Creates a value store over an explicitly supplied synchronous storage object.
 *
 * @remarks
 * Construction captures `getItem`, `setItem`, and `removeItem` once, retaining
 * the supplied storage object as their receiver. It validates the literal
 * prefix and serialiser configuration without reading storage items, and does
 * not look up a browser global. The serialiser receives the logical key; the
 * adapter prepends the captured prefix only when calling storage. It does not
 * expose `ValueClearer` because these three methods cannot enumerate the prefix,
 * and it never calls a global `clear()`.
 *
 * A batch validates and snapshots all operations, then prepares every value in
 * order before synchronous per-key application. The adapter adds no await or
 * serialiser callback between these calls, but the `ifAbsent` read and write do not provide
 * cross-window isolation. A surfaced failure can leave earlier mutations
 * applied. Disposal stops admission synchronously and drains accepted work
 * without changing stored data or closing the supplied storage object.
 *
 * @param storage - Explicit synchronous storage access; its methods are captured
 * once and invoked with this object as their receiver.
 * @param options - Literal physical key prefix and optional paired serialiser.
 * @returns Value operations, ordered batches, deletion, and disposal. Clearing
 * is not available through this minimal storage boundary.
 * @throws `ValueStoreError` is thrown synchronously if the storage object, a
 * required method, options, prefix, or serialiser configuration is invalid.
 * Later operation failures reject their returned promises with a sanitised
 * `ValueStoreError`. A failure during batch application can leave earlier
 * mutations applied.
 * @example
 * ```ts
 * import {
 *   createWebStorageValueStore,
 *   type WebStorageAccess,
 * } from "@vrtmrz/value-store/web-storage";
 *
 * const values = new Map<string, string>();
 * const storage: WebStorageAccess = {
 *   getItem: (key) => values.get(key) ?? null,
 *   setItem: (key, value) => { values.set(key, value); },
 *   removeItem: (key) => { values.delete(key); },
 * };
 * const store = createWebStorageValueStore(storage, { prefix: "app:" });
 * await store.setValue("status", "ready");
 * await store.dispose();
 * ```
 */
export function createWebStorageValueStore(
  storage: WebStorageAccess | null | undefined,
  options: WebStorageValueStoreOptions,
): ValueStore & ValueDeleter & ValueBatchWriter & ValueStoreDisposer {
  const prefix = capturePrefix(options);
  if (storage === null || storage === undefined) {
    throw new ValueStoreError("unavailable");
  }
  if (typeof storage !== "object" && typeof storage !== "function") {
    throw new ValueStoreError("unavailable");
  }

  const getItem = captureMethod(storage, "getItem");
  const setItem = captureMethod(storage, "setItem");
  const removeItem = captureMethod(storage, "removeItem");
  return createEnhancedValueStore({
    get(key) {
      let result: unknown;
      try {
        result = Reflect.apply(getItem, storage, [prefix + key]);
      } catch (error) {
        throw sanitiseValueStoreError(error);
      }
      if (result === null || typeof result === "string") {
        return result;
      }
      throw new ValueStoreError("invalid-data");
    },
    set(key, value) {
      try {
        Reflect.apply(setItem, storage, [prefix + key, value]);
      } catch (error) {
        throw sanitiseValueStoreError(error);
      }
    },
    delete(key) {
      try {
        Reflect.apply(removeItem, storage, [prefix + key]);
      } catch (error) {
        throw sanitiseValueStoreError(error);
      }
    },
    writeBatch(operations) {
      for (const operation of operations) {
        const key = prefix + operation.key;
        if (operation.type === "delete") {
          Reflect.apply(removeItem, storage, [key]);
        } else {
          if (operation.ifAbsent) {
            // The synchronous check/write has no same-agent await gap; another Window is not coordinated.
            const existing: unknown = Reflect.apply(getItem, storage, [key]);
            if (existing !== null && typeof existing !== "string") throw new ValueStoreError("invalid-data");
            if (existing !== null) continue;
          }
          Reflect.apply(setItem, storage, [key, operation.value]);
        }
      }
    },
  }, options);
}

function capturePrefix(options: WebStorageValueStoreOptions): string {
  if ((typeof options !== "object" && typeof options !== "function") || options === null) {
    throw new ValueStoreError("invalid-value");
  }
  let prefix: unknown;
  try {
    prefix = Reflect.get(options, "prefix");
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  validateValuePrefix(prefix);
  return prefix;
}

function captureMethod(storage: WebStorageAccess, name: string): (...args: unknown[]) => unknown {
  let method: unknown;
  try {
    method = Reflect.get(storage, name);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  if (typeof method !== "function") {
    throw new ValueStoreError("unavailable");
  }
  return method as (...args: unknown[]) => unknown;
}
