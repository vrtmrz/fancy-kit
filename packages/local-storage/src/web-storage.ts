import type { LocalValueStore, LocalValueStoreOptions } from "./contracts.js";
import { LocalStorageError, sanitiseLocalStorageError } from "./errors.js";
import { createLocalValueStore } from "./store.js";
import { validateLocalPrefix } from "./validation.js";

/** The subset of Web Storage used by the raw adapter. */
export interface WebStorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Options for the explicit Web Storage adapter. */
export interface WebStorageLocalStoreOptions extends LocalValueStoreOptions {
  /** A complete literal prefix prepended to raw backend keys. */
  prefix: string;
}

/**
 * Wraps an explicitly supplied Web Storage object with a raw string backend.
 *
 * The serializer receives the logical key. Only the raw backend applies the
 * prefix, and construction does not access storage items.
 */
export function createWebStorageLocalStore(
  storage: WebStorageAccess | null | undefined,
  options: WebStorageLocalStoreOptions,
): LocalValueStore {
  const prefix = capturePrefix(options);
  if (storage === null || storage === undefined) {
    throw new LocalStorageError("unavailable");
  }
  if (typeof storage !== "object" && typeof storage !== "function") {
    throw new LocalStorageError("unavailable");
  }

  const getItem = captureMethod(storage, "getItem");
  const setItem = captureMethod(storage, "setItem");
  const removeItem = captureMethod(storage, "removeItem");
  return createLocalValueStore({
    get(key) {
      let result: unknown;
      try {
        result = Reflect.apply(getItem, storage, [prefix + key]);
      } catch (error) {
        throw sanitiseLocalStorageError(error);
      }
      if (result === null || typeof result === "string") {
        return result;
      }
      throw new LocalStorageError("invalid-data");
    },
    set(key, value) {
      try {
        Reflect.apply(setItem, storage, [prefix + key, value]);
      } catch (error) {
        throw sanitiseLocalStorageError(error);
      }
    },
    delete(key) {
      try {
        Reflect.apply(removeItem, storage, [prefix + key]);
      } catch (error) {
        throw sanitiseLocalStorageError(error);
      }
    },
  }, options);
}

function capturePrefix(options: WebStorageLocalStoreOptions): string {
  if ((typeof options !== "object" && typeof options !== "function") || options === null) {
    throw new LocalStorageError("invalid-value");
  }
  let prefix: unknown;
  try {
    prefix = Reflect.get(options, "prefix");
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
  validateLocalPrefix(prefix);
  return prefix;
}

function captureMethod(storage: WebStorageAccess, name: string): (...args: unknown[]) => unknown {
  let method: unknown;
  try {
    method = Reflect.get(storage, name);
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
  if (typeof method !== "function") {
    throw new LocalStorageError("unavailable");
  }
  return method as (...args: unknown[]) => unknown;
}
