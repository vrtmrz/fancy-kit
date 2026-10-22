import type {
  ValueBackend,
  ValueBackendDeleter,
  ValueBackendReader,
  ValueDeleter,
  ValueReader,
  ValueStore,
  ValueStoreOptions,
  ObjectValue,
  ValueSerializer,
} from "./contracts.js";
import { ValueStoreError, sanitiseValueStoreError } from "./errors.js";
import { cloneObjectValue, snapshotObjectValue, validateValueKey, validateValueString, validateObjectValue } from "./validation.js";

type Method = (...args: unknown[]) => unknown;
type CapturedSerializer = { receiver: object | Function; serialize: Method; deserialize: Method } | undefined;

/** Creates an asynchronous reader over an explicitly supplied raw string backend. */
export function createValueReader(
  backend: ValueBackendReader,
  options?: ValueStoreOptions,
): ValueReader {
  const get = captureMethod(backend, "get");
  const serializer = captureSerializer(options);
  return createReaderFacade(createLogicalReader(get, backend, serializer));
}

/** Creates a value store over raw read and replacement-write capabilities. */
export function createValueStore(
  backend: ValueBackend,
  options?: ValueStoreOptions,
): ValueStore {
  const get = captureMethod(backend, "get");
  const set = captureMethod(backend, "set");
  const serializer = captureSerializer(options);
  const reader = createReaderFacade(createLogicalReader(get, backend, serializer));

  return {
    getValue: reader.getValue,
    getObject: reader.getObject,
    setValue(key: string, value: string): Promise<void> {
      return writeLogicalValue(key, value, set, backend, serializer);
    },
    async setObject(key: string, value: ObjectValue): Promise<void> {
      validateValueKey(key);
      const snapshot = snapshotObjectValue(value);
      let text: string;
      try {
        text = JSON.stringify(snapshot);
      } catch {
        throw new ValueStoreError("invalid-value");
      }
      if (typeof text !== "string") {
        throw new ValueStoreError("invalid-value");
      }
      await writeLogicalValue(key, text, set, backend, serializer);
    },
  };
}

/** Creates a value store with an explicitly captured raw deletion capability. */
export function createDeletableValueStore(
  backend: ValueBackend & ValueBackendDeleter,
  options?: ValueStoreOptions,
): ValueStore & ValueDeleter {
  const store = createValueStore(backend, options);
  const remove = captureMethod(backend, "delete");
  return {
    ...store,
    delete(key: string): Promise<void> {
      return deleteLogicalValue(key, remove, backend);
    },
  };
}

function createReaderFacade(
  readLogicalValue: (key: string) => Promise<string | null>,
): ValueReader {
  function getValue(key: string, defaultValue: string): Promise<string>;
  function getValue(key: string, defaultValue?: string): Promise<string | null>;
  async function getValue(key: string, defaultValue?: string): Promise<string | null> {
    validateValueKey(key);
    if (defaultValue !== undefined) validateValueString(defaultValue);
    const value = await readLogicalValue(key);
    return value === null ? defaultValue ?? null : value;
  }

  function getObject(key: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  function getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
  async function getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined> {
    validateValueKey(key);
    const snapshot = defaultValue === undefined ? undefined : cloneObjectValue(defaultValue);
    return readObject(key, readLogicalValue, snapshot);
  }

  return { getValue, getObject };
}

function createLogicalReader(
  get: Method,
  backend: object | Function,
  serializer: CapturedSerializer,
): (key: string) => Promise<string | null> {
  return async (key: string): Promise<string | null> => {
    let stored: unknown;
    try {
      stored = await Reflect.apply(get, backend, [key]);
    } catch (error) {
      throw sanitiseValueStoreError(error);
    }
    if (stored === null) {
      return null;
    }
    if (typeof stored !== "string") {
      throw new ValueStoreError("invalid-data");
    }
    if (serializer === undefined) {
      return stored;
    }

    let logical: unknown;
    try {
      logical = await Reflect.apply(serializer.deserialize, serializer.receiver, [key, stored]);
    } catch (error) {
      throw sanitiseValueStoreError(error);
    }
    validateValueString(logical, "invalid-data");
    return logical;
  };
}

async function readObject(
  key: string,
  readLogicalValue: (key: string) => Promise<string | null>,
  defaultValue: ObjectValue | undefined,
): Promise<ObjectValue | undefined> {
  const text = await readLogicalValue(key);
  if (text === null) {
    return defaultValue;
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ValueStoreError("invalid-data");
  }
  validateObjectValue(value, "invalid-data");
  return cloneObjectValue(value);
}

async function writeLogicalValue(
  key: string,
  value: string,
  set: Method,
  backend: object | Function,
  serializer: CapturedSerializer,
): Promise<void> {
  validateValueKey(key);
  validateValueString(value);

  let stored = value;
  if (serializer !== undefined) {
    let serialised: unknown;
    try {
      serialised = await Reflect.apply(serializer.serialize, serializer.receiver, [key, value]);
    } catch (error) {
      throw sanitiseValueStoreError(error);
    }
    validateValueString(serialised);
    stored = serialised;
  }

  try {
    await Reflect.apply(set, backend, [key, stored]);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
}

async function deleteLogicalValue(
  key: string,
  remove: Method,
  backend: object | Function,
): Promise<void> {
  validateValueKey(key);
  try {
    await Reflect.apply(remove, backend, [key]);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
}

function captureSerializer(options?: ValueStoreOptions): CapturedSerializer {
  if (options === undefined) {
    return undefined;
  }
  if ((typeof options !== "object" && typeof options !== "function") || options === null) {
    throw new ValueStoreError("invalid-value");
  }

  let supplied: unknown;
  try {
    supplied = Reflect.get(options, "serializer");
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  if (supplied === undefined) {
    return undefined;
  }
  if ((typeof supplied !== "object" && typeof supplied !== "function") || supplied === null) {
    throw new ValueStoreError("invalid-value");
  }

  let serialize: unknown;
  let deserialize: unknown;
  try {
    serialize = Reflect.get(supplied, "serialize");
    deserialize = Reflect.get(supplied, "deserialize");
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  if (typeof serialize !== "function" || typeof deserialize !== "function") {
    throw new ValueStoreError("invalid-value");
  }
  return {
    receiver: supplied,
    serialize: serialize as Method,
    deserialize: deserialize as Method,
  };
}

function captureMethod(target: unknown, name: string): Method {
  if ((typeof target !== "object" && typeof target !== "function") || target === null) {
    throw new ValueStoreError("unavailable");
  }
  let method: unknown;
  try {
    method = Reflect.get(target, name);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  if (typeof method !== "function") {
    throw new ValueStoreError("unavailable");
  }
  return method as Method;
}
