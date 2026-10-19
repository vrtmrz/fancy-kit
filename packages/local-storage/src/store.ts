import type {
  LocalValueBackend,
  LocalValueBackendReader,
  LocalValueReader,
  LocalValueStore,
  LocalValueStoreOptions,
  ObjectValue,
  ValueSerializer,
} from "./contracts.js";
import { LocalStorageError, sanitiseLocalStorageError } from "./errors.js";
import { cloneObjectValue, validateLocalKey, validateLocalValue, validateObjectValue } from "./validation.js";

type Method = (...args: unknown[]) => unknown;
type CapturedSerializer = { receiver: object | Function; serialize: Method; deserialize: Method } | undefined;

/** Creates an asynchronous reader over an explicitly supplied raw string backend. */
export function createLocalValueReader(
  backend: LocalValueBackendReader,
  options?: LocalValueStoreOptions,
): LocalValueReader {
  const get = captureMethod(backend, "get");
  const serializer = captureSerializer(options);
  const readLogicalValue = createLogicalReader(get, backend, serializer);

  return {
    getValue(key: string): Promise<string | null> {
      return readLogicalValue(key);
    },
    getObject(key: string): Promise<ObjectValue | undefined> {
      return readObject(key, readLogicalValue);
    },
  };
}

/** Creates an asynchronous local-value store over a raw string backend. */
export function createLocalValueStore(
  backend: LocalValueBackend,
  options?: LocalValueStoreOptions,
): LocalValueStore {
  const get = captureMethod(backend, "get");
  const set = captureMethod(backend, "set");
  const remove = captureMethod(backend, "delete");
  const serializer = captureSerializer(options);
  const readLogicalValue = createLogicalReader(get, backend, serializer);

  return {
    getValue(key: string): Promise<string | null> {
      return readLogicalValue(key);
    },
    getObject(key: string): Promise<ObjectValue | undefined> {
      return readObject(key, readLogicalValue);
    },
    setValue(key: string, value: string): Promise<void> {
      return writeLogicalValue(key, value, set, remove, backend, serializer);
    },
    async setObject(key: string, value: ObjectValue): Promise<void> {
      validateLocalKey(key);
      const snapshot = cloneObjectValue(value);
      let text: string;
      try {
        text = JSON.stringify(snapshot);
      } catch {
        throw new LocalStorageError("invalid-value");
      }
      if (typeof text !== "string" || text.length === 0) {
        throw new LocalStorageError("invalid-value");
      }
      await writeLogicalValue(key, text, set, remove, backend, serializer);
    },
    delete(key: string): Promise<void> {
      return deleteLogicalValue(key, remove, backend);
    },
  };
}

function createLogicalReader(
  get: Method,
  backend: object | Function,
  serializer: CapturedSerializer,
): (key: string) => Promise<string | null> {
  return async (key: string): Promise<string | null> => {
    validateLocalKey(key);
    let stored: unknown;
    try {
      stored = await Reflect.apply(get, backend, [key]);
    } catch (error) {
      throw sanitiseLocalStorageError(error);
    }
    if (stored === null) {
      return null;
    }
    if (typeof stored !== "string") {
      throw new LocalStorageError("invalid-data");
    }
    if (serializer === undefined) {
      return stored;
    }

    let logical: unknown;
    try {
      logical = await Reflect.apply(serializer.deserialize, serializer.receiver, [key, stored]);
    } catch (error) {
      throw sanitiseLocalStorageError(error);
    }
    validateLocalValue(logical, "invalid-data");
    return logical;
  };
}

async function readObject(
  key: string,
  readLogicalValue: (key: string) => Promise<string | null>,
): Promise<ObjectValue | undefined> {
  const text = await readLogicalValue(key);
  if (text === null) {
    return undefined;
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new LocalStorageError("invalid-data");
  }
  validateObjectValue(value, "invalid-data");
  return cloneObjectValue(value);
}

async function writeLogicalValue(
  key: string,
  value: string,
  set: Method,
  remove: Method,
  backend: object | Function,
  serializer: CapturedSerializer,
): Promise<void> {
  validateLocalKey(key);
  validateLocalValue(value);
  if (value === "") {
    return deleteLogicalValue(key, remove, backend);
  }

  let stored = value;
  if (serializer !== undefined) {
    let serialised: unknown;
    try {
      serialised = await Reflect.apply(serializer.serialize, serializer.receiver, [key, value]);
    } catch (error) {
      throw sanitiseLocalStorageError(error);
    }
    validateLocalValue(serialised);
    if (serialised.length === 0) {
      throw new LocalStorageError("invalid-value");
    }
    stored = serialised;
  }

  try {
    await Reflect.apply(set, backend, [key, stored]);
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
}

async function deleteLogicalValue(
  key: string,
  remove: Method,
  backend: object | Function,
): Promise<void> {
  validateLocalKey(key);
  try {
    await Reflect.apply(remove, backend, [key]);
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
}

function captureSerializer(options?: LocalValueStoreOptions): CapturedSerializer {
  if (options === undefined) {
    return undefined;
  }
  if ((typeof options !== "object" && typeof options !== "function") || options === null) {
    throw new LocalStorageError("invalid-value");
  }

  let supplied: unknown;
  try {
    supplied = Reflect.get(options, "serializer");
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
  if (supplied === undefined) {
    return undefined;
  }
  if ((typeof supplied !== "object" && typeof supplied !== "function") || supplied === null) {
    throw new LocalStorageError("invalid-value");
  }

  let serialize: unknown;
  let deserialize: unknown;
  try {
    serialize = Reflect.get(supplied, "serialize");
    deserialize = Reflect.get(supplied, "deserialize");
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
  if (typeof serialize !== "function" || typeof deserialize !== "function") {
    throw new LocalStorageError("invalid-value");
  }
  return {
    receiver: supplied,
    serialize: serialize as Method,
    deserialize: deserialize as Method,
  };
}

function captureMethod(target: unknown, name: string): Method {
  if ((typeof target !== "object" && typeof target !== "function") || target === null) {
    throw new LocalStorageError("unavailable");
  }
  let method: unknown;
  try {
    method = Reflect.get(target, name);
  } catch (error) {
    throw sanitiseLocalStorageError(error);
  }
  if (typeof method !== "function") {
    throw new LocalStorageError("unavailable");
  }
  return method as Method;
}
