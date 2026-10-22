import {
  createValueReader,
  createValueStore,
  ValueStoreError,
  type ValueReader,
  type ValueStoreOptions,
} from "@vrtmrz/value-store";
import type {
  ObjectValue,
  SecretBackend,
  SecretBackendReader,
  SecretReader,
  SecretStore,
  SecretStoreOptions,
  ValueSerializer,
} from "./contracts.js";
import { validateSecretName, validateSecretValue } from "./validation.js";

/**
 * Creates a read-only secret profile over an explicitly selected raw backend.
 * Construction captures methods and configuration but performs no backend I/O.
 * @param backend - A raw reader whose `get` method returns a string or absence.
 * @param options - Optional instance-scoped value serialisation.
 */
export function createSecretReader(
  backend: SecretBackendReader,
  options?: SecretStoreOptions,
): SecretReader {
  return createSecretReaderFacade(createValueReader(backend, profileOptions(options)));
}

/**
 * Creates a read/write secret profile over an explicitly selected raw backend.
 * Construction captures methods and configuration but performs no backend I/O.
 * The profile exposes no deletion or enumeration capability.
 * @param backend - A raw reader and writer.
 * @param options - Optional instance-scoped value serialisation.
 */
export function createSecretStore(
  backend: SecretBackend,
  options?: SecretStoreOptions,
): SecretStore {
  const store = createValueStore(backend, profileOptions(options));
  const reader = createSecretReaderFacade(store);
  return {
    getValue: reader.getValue,
    getObject: reader.getObject,
    async setValue(name, value) {
      validateSecretName(name);
      validateSecretValue(value);
      await store.setValue(name, value);
    },
    async setObject(name, value) {
      validateSecretName(name);
      // The shared facade validates and snapshots JSON before its first await.
      await store.setObject(name, value);
    },
  };
}

function createSecretReaderFacade(reader: ValueReader): SecretReader {
  function getValue(name: string, defaultValue: string): Promise<string>;
  function getValue(name: string, defaultValue?: string): Promise<string | null>;
  async function getValue(name: string, defaultValue?: string): Promise<string | null> {
    validateSecretName(name);
    if (defaultValue !== undefined) validateSecretValue(defaultValue);
    return reader.getValue(name, defaultValue);
  }

  function getObject(name: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  function getObject(name: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
  async function getObject(name: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined> {
    validateSecretName(name);
    return reader.getObject(name, defaultValue);
  }

  return { getValue, getObject };
}

function profileOptions(options: SecretStoreOptions | undefined): ValueStoreOptions {
  return {
    // Defer capture until the common facade has captured the backend methods.
    get serializer(): ValueSerializer {
      const captured = captureSerializer(options);
      return {
        async serialize(name, value) {
          const encoded: unknown = captured === undefined
            ? value
            : await Reflect.apply(captured.serialize, captured.receiver, [name, value]);
          validateSecretValue(encoded);
          return encoded;
        },
        async deserialize(name, raw) {
          const value: unknown = captured === undefined
            ? raw
            : await Reflect.apply(captured.deserialize, captured.receiver, [name, raw]);
          try {
            validateSecretValue(value);
          } catch {
            throw new ValueStoreError("invalid-data");
          }
          return value;
        },
      };
    },
  };
}

type CapturedSerializer = {
  receiver: object;
  serialize: (key: string, value: string) => unknown;
  deserialize: (key: string, value: string) => unknown;
};

function captureSerializer(options: SecretStoreOptions | undefined): CapturedSerializer | undefined {
  if (options === undefined) return undefined;
  if (!isObjectLike(options)) throw new ValueStoreError("invalid-value");
  const serializer = options.serializer;
  if (serializer === undefined) return undefined;
  if (!isObjectLike(serializer)) throw new ValueStoreError("invalid-value");
  // The common facade sanitises errors from these getters and from callbacks.
  const serialize = (serializer as ValueSerializer).serialize;
  const deserialize = (serializer as ValueSerializer).deserialize;
  if (typeof serialize !== "function" || typeof deserialize !== "function") {
    throw new ValueStoreError("invalid-value");
  }
  return { receiver: serializer, serialize, deserialize };
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
