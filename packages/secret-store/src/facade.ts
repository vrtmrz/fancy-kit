import type {
  ObjectValue,
  SecretBackend,
  SecretBackendReader,
  SecretReader,
  SecretStore,
  SecretStoreOptions,
  ValueSerializer,
} from "./contracts.js";
import { sanitiseSecretStoreError, SecretStoreError } from "./errors.js";
import { snapshotObjectValue, validateStoredObjectValue } from "./object-value.js";
import { validateSecretName, validateSecretValue } from "./validation.js";

type CapturedBackend = {
  receiver: unknown;
  get: (name: string) => unknown;
  set?: (name: string, value: string) => unknown;
};
type CapturedSerializer = {
  receiver: unknown;
  serialize: (key: string, value: string) => unknown;
  deserialize: (key: string, value: string) => unknown;
};

/**
 * Creates a read-only facade over an explicitly selected raw string backend.
 * Construction captures methods and configuration but performs no backend I/O.
 * @param backend - A raw reader whose `get` method returns a string or absence.
 * @param options - Optional instance-scoped value serialisation.
 */
export function createSecretReader(
  backend: SecretBackendReader,
  options?: SecretStoreOptions,
): SecretReader {
  const capturedBackend = captureBackend(backend, false);
  const serializer = captureSerializer(options);
  return createReaderFacade(capturedBackend, serializer);
}

/**
 * Creates a read/write facade over an explicitly selected raw string backend.
 * Construction captures methods and configuration but performs no backend I/O.
 * @param backend - A raw reader and writer.
 * @param options - Optional instance-scoped value serialisation.
 */
export function createSecretStore(
  backend: SecretBackend,
  options?: SecretStoreOptions,
): SecretStore {
  const capturedBackend = captureBackend(backend, true);
  const serializer = captureSerializer(options);
  const reader = createReaderFacade(capturedBackend, serializer);

  return {
    getValue: reader.getValue,
    getObject: reader.getObject,
    async setValue(name, value) {
      validateSecretName(name);
      validateSecretValue(value);
      await writeValue(capturedBackend, serializer, name, value);
    },
    async setObject(name, value) {
      validateSecretName(name);
      const snapshot = snapshotObjectValue(value);
      let json: string;
      try {
        json = JSON.stringify(snapshot);
      } catch {
        throw new SecretStoreError("invalid-value");
      }
      if (typeof json !== "string" || json.length === 0) {
        throw new SecretStoreError("invalid-value");
      }
      // Snapshotting and JSON conversion finish before writeValue reaches its first await.
      await writeValue(capturedBackend, serializer, name, json);
    },
  };
}

function createReaderFacade(
  backend: CapturedBackend,
  serializer: CapturedSerializer | undefined,
): SecretReader {
  return {
    async getValue(name) {
      validateSecretName(name);
      return readValue(backend, serializer, name);
    },
    async getObject(name) {
      validateSecretName(name);
      const value = await readValue(backend, serializer, name);
      if (value === null) {
        return undefined;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(value) as unknown;
      } catch {
        throw new SecretStoreError("invalid-data");
      }
      validateStoredObjectValue(parsed);
      return parsed;
    },
  };
}

async function readValue(
  backend: CapturedBackend,
  serializer: CapturedSerializer | undefined,
  name: string,
): Promise<string | null> {
  let raw: unknown;
  try {
    raw = await Reflect.apply(backend.get, backend.receiver, [name]);
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
  if (raw === null) {
    return null;
  }
  if (typeof raw !== "string") {
    throw new SecretStoreError("invalid-data");
  }
  if (serializer === undefined) {
    try {
      validateSecretValue(raw);
    } catch {
      throw new SecretStoreError("invalid-data");
    }
    return raw;
  }

  let value: unknown;
  try {
    value = await Reflect.apply(serializer.deserialize, serializer.receiver, [name, raw]);
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
  if (typeof value !== "string") {
    throw new SecretStoreError("invalid-data");
  }
  try {
    validateSecretValue(value);
  } catch {
    throw new SecretStoreError("invalid-data");
  }
  return value;
}

async function writeValue(
  backend: CapturedBackend,
  serializer: CapturedSerializer | undefined,
  name: string,
  value: string,
): Promise<void> {
  let raw = value;
  if (serializer !== undefined) {
    let serialized: unknown;
    try {
      serialized = await Reflect.apply(serializer.serialize, serializer.receiver, [name, value]);
    } catch (error) {
      throw sanitiseSecretStoreError(error);
    }
    if (typeof serialized !== "string") {
      throw new SecretStoreError("invalid-value");
    }
    try {
      validateSecretValue(serialized);
    } catch {
      throw new SecretStoreError("invalid-value");
    }
    raw = serialized;
  }

  const set = backend.set;
  if (set === undefined) {
    throw new SecretStoreError("operation-failed");
  }
  try {
    await Reflect.apply(set, backend.receiver, [name, raw]);
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
}

function captureBackend(
  backend: SecretBackendReader,
  writable: boolean,
): CapturedBackend {
  if (!isObjectLike(backend)) {
    throw new SecretStoreError("invalid-value");
  }
  let get: unknown;
  let set: unknown;
  try {
    get = backend.get;
    if (writable) {
      set = (backend as SecretBackend).set;
    }
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
  if (typeof get !== "function" || (writable && typeof set !== "function")) {
    throw new SecretStoreError("invalid-value");
  }
  return {
    receiver: backend,
    get: get as CapturedBackend["get"],
    ...(writable ? { set: set as CapturedBackend["set"] } : {}),
  };
}

function captureSerializer(options: SecretStoreOptions | undefined): CapturedSerializer | undefined {
  if (options === undefined) {
    return undefined;
  }
  if (!isObjectLike(options)) {
    throw new SecretStoreError("invalid-value");
  }

  let serializer: unknown;
  try {
    serializer = options.serializer;
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
  if (serializer === undefined) {
    return undefined;
  }
  if (!isObjectLike(serializer)) {
    throw new SecretStoreError("invalid-value");
  }

  let serialize: unknown;
  let deserialize: unknown;
  try {
    serialize = (serializer as ValueSerializer).serialize;
    deserialize = (serializer as ValueSerializer).deserialize;
  } catch (error) {
    throw sanitiseSecretStoreError(error);
  }
  if (typeof serialize !== "function" || typeof deserialize !== "function") {
    throw new SecretStoreError("invalid-value");
  }
  return {
    receiver: serializer,
    serialize: serialize as CapturedSerializer["serialize"],
    deserialize: deserialize as CapturedSerializer["deserialize"],
  };
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
