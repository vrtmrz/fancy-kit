import type {
  ValueBackend,
  ValueBackendDeleter,
  ValueBackendReader,
  ValueBatchOperation,
  ValueDeleter,
  ValueReader,
  ValueStore,
  ValueStoreOptions,
  ObjectValue,
  ValueSerializer,
} from "./contracts.js";
import { ValueStoreError, sanitiseValueStoreError } from "./errors.js";
import type { PreparedValueOperation } from "./enhanced-store.js";
import { cloneObjectValue, snapshotObjectValue, validateValueKey, validateValueString, validateObjectValue } from "./validation.js";

type Method = (...args: unknown[]) => unknown;
type CapturedSerializer = { receiver: object | Function; serialize: Method; deserialize: Method } | undefined;

/**
 * Creates an asynchronous reader over an explicitly supplied raw string backend.
 *
 * @remarks
 * Construction captures `get` with its receiver and the optional serialiser pair
 * without probing storage. Keys remain logical and exact; prefix mapping belongs
 * to the backend. Missing values bypass deserialisation and use the validated
 * getter default, while read, decoding, and JSON failures remain errors.
 *
 * @param backend - Raw string reads returning null only for absence.
 * @param options - Instance-scoped paired serialisation; omitted for identity conversion.
 * @returns A reader whose getter promises settle after deserialisation and JSON decoding.
 * @throws {@link ValueStoreError} Synchronously for malformed capabilities or options.
 * Later read and deserialisation failures reject the getter promises.
 */
export function createValueReader(
  backend: ValueBackendReader,
  options?: ValueStoreOptions,
): ValueReader {
  const get = captureMethod(backend, "get");
  const serializer = captureSerializer(options);
  return createReaderFacade(createLogicalReader(get, backend, serializer));
}

/**
 * Creates a value store over raw read and replacement-write capabilities.
 *
 * @remarks
 * Captures only `get`, `set`, and the serialiser pair with their receivers; no
 * probe read or write occurs. Empty strings are data. Object writes validate and
 * snapshot JSON before awaiting, then use the same serialiser as string writes.
 * An empty serialised string is allowed only if the chosen backend can represent
 * it. Await dependencies between calls: no invocation-order guarantee, value
 * cache, transaction, automatic retry, or backend fallback is introduced.
 *
 * @param backend - Raw string reads and replacement writes selected by the caller.
 * @param options - Instance-scoped paired serialisation; omitted for identity conversion.
 * @returns Read and replacement-write operations over the captured backend.
 * @throws {@link ValueStoreError} Synchronously for malformed capabilities or options.
 * Validation, serialisation, and backend failures reject each operation's promise.
 */
export function createValueStore(
  backend: ValueBackend,
  options?: ValueStoreOptions,
): ValueStore {
  return createStoreEngine(backend, options).store;
}

function createStoreEngine(backend: ValueBackend, options?: ValueStoreOptions) {
  const get = captureMethod(backend, "get");
  const set = captureMethod(backend, "set");
  const serializer = captureSerializer(options);
  const reader = createReaderFacade(createLogicalReader(get, backend, serializer));

  const store: ValueStore = {
    getValue: reader.getValue,
    getObject: reader.getObject,
    setValue(key: string, value: string): Promise<void> {
      return writeLogicalValue(key, value, set, backend, serializer);
    },
    async setObject(key: string, value: ObjectValue): Promise<void> {
      validateValueKey(key);
      const text = encodeObjectValue(value);
      await writeLogicalValue(key, text, set, backend, serializer);
    },
  };
  return {
    store,
    async prepareBatch(operations: readonly ValueBatchOperation[]): Promise<PreparedValueOperation[]> {
      // Snapshot and validate the entire caller-owned array before any serialiser can await.
      const snapshot = snapshotBatch(operations);
      const prepared: PreparedValueOperation[] = [];
      // Sequential preparation preserves input order and finishes before backend application begins.
      for (const operation of snapshot) {
        if (operation.type === "delete") {
          prepared.push(operation);
        } else {
          const value = await prepareLogicalValue(operation.key, operation.value, serializer);
          prepared.push({ ...operation, value });
        }
      }
      return prepared;
    },
  };
}

/**
 * Creates a value store with an explicitly captured raw deletion capability.
 *
 * @remarks
 * Captures the backend's `get`, `set`, and `delete` methods and the optional
 * serialiser pair once without storage I/O. Deletion skips the serialiser;
 * `setValue(key, '')` remains an ordinary value write. The backend's lifetime
 * remains with its owner, and errors use the shared fixed-message boundary.
 *
 * @param backend - Raw string read, replacement-write, and explicit delete capabilities.
 * @param options - Instance-scoped paired serialisation; omitted for identity conversion.
 * @returns Value operations and explicit deletion over that backend.
 * @throws {@link ValueStoreError} Synchronously for malformed capabilities or options.
 * Later failures reject the operation promises without automatic retries.
 *
 * @example
 * ```ts
 * import { createDeletableValueStore } from '@vrtmrz/value-store';
 *
 * const entries = new Map<string, string>();
 * const store = createDeletableValueStore({
 *   get: (key) => entries.get(key) ?? null,
 *   set: (key, value) => { entries.set(key, value); },
 *   delete: (key) => { entries.delete(key); },
 * });
 * await store.setValue('label', '');
 * await store.delete('label');
 * ```
 */
export function createDeletableValueStore(
  backend: ValueBackend & ValueBackendDeleter,
  options?: ValueStoreOptions,
): ValueStore & ValueDeleter {
  return createPreparedValueStore(backend, options).store;
}

/**
 * Internal shared value engine and batch preparer for enhanced adapters.
 *
 * @param backend - Raw read/write/delete capabilities captured once with their receiver.
 * @param options - One serialiser pair shared by ordinary operations and batch preparation.
 * @returns The ordinary facade and a preparer that snapshots the full batch before awaiting.
 * The preparer performs no backend mutation and returns only serialised operations.
 * @throws {@link ValueStoreError} For invalid construction-time capabilities or options.
 */
export function createPreparedValueStore(
  backend: ValueBackend & ValueBackendDeleter,
  options?: ValueStoreOptions,
) {
  const engine = createStoreEngine(backend, options);
  const remove = captureMethod(backend, "delete");
  const store: ValueStore & ValueDeleter = {
    ...engine.store,
    delete(key: string): Promise<void> {
      return deleteLogicalValue(key, remove, backend);
    },
  };
  return { store, prepareBatch: engine.prepareBatch };
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
      // Absence is not data and therefore bypasses deserialisation.
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
  const prepared = prepareLogicalValue(key, value, serializer);
  const stored = typeof prepared === "string" ? prepared : await prepared;
  try {
    await Reflect.apply(set, backend, [key, stored]);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
}

function prepareLogicalValue(
  key: string,
  value: string,
  serializer: CapturedSerializer,
): string | Promise<string> {
  validateValueKey(key);
  validateValueString(value);
  return serializer === undefined ? value : serializeLogicalValue(key, value, serializer);
}

async function serializeLogicalValue(
  key: string,
  value: string,
  serializer: NonNullable<CapturedSerializer>,
): Promise<string> {
  let serialised: unknown;
  try {
    serialised = await Reflect.apply(serializer.serialize, serializer.receiver, [key, value]);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  validateValueString(serialised);
  return serialised;
}

function encodeObjectValue(value: ObjectValue): string {
  // Validate and detach JSON data before encoding; snapshotting invokes no accessors or toJSON methods.
  const snapshot = snapshotObjectValue(value);
  try {
    const text = JSON.stringify(snapshot);
    if (typeof text === "string") return text;
  } catch {
    throw new ValueStoreError("invalid-value");
  }
  throw new ValueStoreError("invalid-value");
}

function snapshotBatch(operations: readonly ValueBatchOperation[]): PreparedValueOperation[] {
  try {
    // Descriptor reads reject holes and accessors without invoking property getters.
    if (!Array.isArray(operations)) throw new ValueStoreError("invalid-value");
    const snapshot: PreparedValueOperation[] = [];
    const length = operations.length;
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(operations, String(index));
      if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) {
        throw new ValueStoreError("invalid-value");
      }
      const operation: unknown = descriptor.value;
      if (operation === null || typeof operation !== "object" || Array.isArray(operation)) {
        throw new ValueStoreError("invalid-value");
      }
      const type = batchField(operation, "type");
      if (type !== "setValue" && type !== "setObject" && type !== "delete") {
        throw new ValueStoreError("invalid-value");
      }
      const key = batchField(operation, "key");
      validateValueKey(key);
      if (type === "delete") {
        snapshot.push({ type, key });
        continue;
      }
      const ifAbsent = batchField(operation, "ifAbsent");
      if (ifAbsent !== undefined && typeof ifAbsent !== "boolean") {
        throw new ValueStoreError("invalid-value");
      }
      const supplied = batchField(operation, "value");
      const value = type === "setObject" ? encodeObjectValue(supplied as ObjectValue) : supplied;
      validateValueString(value);
      snapshot.push({ type: "set", key, value, ifAbsent });
    }
    return snapshot;
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
}

function batchField(operation: object, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(operation, name);
  if (descriptor === undefined) return undefined;
  if (!Object.hasOwn(descriptor, "value")) throw new ValueStoreError("invalid-value");
  return descriptor.value;
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
