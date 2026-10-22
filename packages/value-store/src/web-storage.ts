import type { ValueDeleter, ValueStore, ValueStoreOptions } from "./contracts.js";
import { ValueStoreError, sanitiseValueStoreError } from "./errors.js";
import { createDeletableValueStore } from "./store.js";
import { validateValuePrefix } from "./validation.js";

/** The subset of Web Storage used by the raw adapter. */
export interface WebStorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Options for the explicit Web Storage adapter. */
export interface WebStorageValueStoreOptions extends ValueStoreOptions {
  /** A complete literal prefix prepended to raw backend keys. */
  prefix: string;
}

/**
 * Wraps an explicitly supplied Web Storage object with a raw string backend.
 *
 * The serializer receives the logical key. Only the raw backend applies the
 * prefix, and construction does not access storage items.
 */
export function createWebStorageValueStore(
  storage: WebStorageAccess | null | undefined,
  options: WebStorageValueStoreOptions,
): ValueStore & ValueDeleter {
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
  return createDeletableValueStore({
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
