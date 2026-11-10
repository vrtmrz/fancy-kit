import type {
  ObjectValue,
  ValueBackend,
  ValueBackendDeleter,
  ValueBatchOperation,
  ValueBatchWriter,
  ValueClearer,
  ValueDeleter,
  ValueStore,
  ValueStoreDisposer,
  ValueStoreOptions,
} from "./contracts.js";
import { sanitiseValueStoreError, ValueStoreError } from "./errors.js";
import { createPreparedValueStore } from "./store.js";

/** Internal raw mutation after complete validation, snapshots, and serialisation. */
export type PreparedValueOperation =
  | { type: "set"; key: string; value: string; ifAbsent?: boolean }
  | { type: "delete"; key: string };

/** Internal backend boundary; keys are logical and values are serialised strings. */
export interface EnhancedValueBackend extends ValueBackend, ValueBackendDeleter {
  /** Applies prepared mutations in order, including an empty lifecycle-only batch. */
  writeBatch(operations: readonly PreparedValueOperation[]): void | Promise<void>;
  /** Removes only the backend's captured scope when supported. */
  clear?(): void | Promise<void>;
}

/**
 * Internal admission and teardown hooks around complete facade operations.
 *
 * @remarks
 * The facade owns its accepting/draining/disposed state and per-store count;
 * these hooks let a backend additionally count work across shared connections.
 * They execute outside backend SQL application, not inside a transaction callback.
 */
export interface ValueStoreLifecycle {
  /**
   * Registers work synchronously before input validation or the first await.
   *
   * @remarks
   * Throwing rejects admission; `onFinish()` is not called for that operation.
   * The facade still settles its own pending count so disposal can drain.
   */
  onStart(): void;
  /**
   * Releases admitted work after preparation, I/O, and decoding have settled.
   *
   * @remarks
   * Called once after each successful `onStart()`, including operation failure.
   * This hook may reserve idle cleanup but must not defer the actual data write.
   */
  onFinish(): void;
  /**
   * Releases this facade's resources after every accepted operation settles.
   *
   * @returns Optional asynchronous teardown completion, shared by repeated disposal calls.
   * @throws A failure which the facade sanitises and retains as its disposal result.
   */
  dispose(): void | Promise<void>;
}

/** Internal common facade type for built-in stores with batches and disposal. */
export type EnhancedValueStore = ValueStore & ValueDeleter & ValueBatchWriter & ValueStoreDisposer;

type Method = (...args: unknown[]) => unknown;

/**
 * Creates the shared enhanced facade for a backend with scoped clearing.
 *
 * @param backend - Captured raw string, prepared-batch, deletion, and clear capabilities.
 * @param options - Captured paired serialisation; omitted for identity conversion.
 * @param lifecycle - Optional shared-resource admission and teardown hooks.
 * @returns Value operations and explicit batch, clear, and terminal disposal capabilities.
 * @throws A fixed `ValueStoreError` for malformed capabilities or serialisation options.
 */
export function createEnhancedValueStore(
  backend: EnhancedValueBackend & { clear(): void | Promise<void> },
  options?: ValueStoreOptions,
  lifecycle?: ValueStoreLifecycle,
): EnhancedValueStore & ValueClearer;
/**
 * Creates the shared enhanced facade without requiring a clear capability.
 *
 * @remarks
 * Validation and snapshots precede asynchronous preparation. Preparation finishes
 * before batch application. Disposal stops admission synchronously, waits for all
 * outcomes, and then invokes lifecycle teardown once; it never replays ordinary
 * operation errors or certifies that previous writes succeeded.
 *
 * @param backend - Captured raw string, deletion, and prepared-batch capabilities.
 * @param options - Captured paired serialisation; omitted for identity conversion.
 * @param lifecycle - Optional shared-resource admission and teardown hooks.
 * @returns Value operations with batch and terminal disposal; clear is not promised.
 * @throws A fixed `ValueStoreError` for malformed capabilities or serialisation options.
 */
export function createEnhancedValueStore(
  backend: EnhancedValueBackend,
  options?: ValueStoreOptions,
  lifecycle?: ValueStoreLifecycle,
): EnhancedValueStore;
export function createEnhancedValueStore(
  backend: EnhancedValueBackend,
  options?: ValueStoreOptions,
  lifecycle?: ValueStoreLifecycle,
): EnhancedValueStore & Partial<ValueClearer> {
  const { store, prepareBatch } = createPreparedValueStore(backend, options);
  const writeBatch = captureMethod(backend, "writeBatch");
  const clear = captureMethod(backend, "clear", true);
  let accepting = true;
  // Per-facade drain count; lifecycle hooks may also maintain a backend-wide count.
  let pending = 0;
  let drained: (() => void) | undefined;
  let disposal: Promise<void> | undefined;

  function run<T>(operation: () => Promise<T> | T): Promise<T> {
    if (!accepting) return Promise.reject(new ValueStoreError("unavailable"));
    // Admit work before validation or serialiser execution can yield.
    pending += 1;
    return (async () => {
      let started = false;
      try {
        lifecycle?.onStart();
        started = true;
        return await operation();
      } catch (error) {
        throw sanitiseValueStoreError(error);
      } finally {
        try {
          if (started) lifecycle?.onFinish();
        } catch (error) {
          throw sanitiseValueStoreError(error);
        } finally {
          pending -= 1;
          if (pending === 0) drained?.();
        }
      }
    })();
  }

  function dispose(): Promise<void> {
    // Close admission synchronously, then release resources only after this facade drains.
    accepting = false;
    disposal ??= (async () => {
      if (pending > 0) await new Promise<void>((resolve) => { drained = resolve; });
      try {
        await lifecycle?.dispose();
      } catch (error) {
        throw sanitiseValueStoreError(error);
      }
    })();
    return disposal;
  }

  const enhanced: EnhancedValueStore & Partial<ValueClearer> = {
    getValue: ((key: string, defaultValue?: string) => run(() => store.getValue(key, defaultValue))) as ValueStore["getValue"],
    getObject: ((key: string, defaultValue?: ObjectValue) => run(() => store.getObject(key, defaultValue))) as ValueStore["getObject"],
    setValue: (key, value) => run(() => store.setValue(key, value)),
    setObject: (key, value) => run(() => store.setObject(key, value)),
    delete: (key) => run(() => store.delete(key)),
    writeBatch: (operations: readonly ValueBatchOperation[]) => run(async () => {
      // The backend sees no mutation unless the complete ordered batch has prepared successfully.
      const prepared = await prepareBatch(operations);
      await Reflect.apply(writeBatch, backend, [prepared]);
    }),
    dispose,
  };
  if (clear !== undefined) enhanced.clear = () => run(async () => { await Reflect.apply(clear, backend, []); });
  return enhanced;
}

function captureMethod(target: object, name: string): Method;
function captureMethod(target: object, name: string, optional: true): Method | undefined;
function captureMethod(target: object, name: string, optional = false): Method | undefined {
  let method: unknown;
  try {
    method = Reflect.get(target, name);
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
  if (optional && method === undefined) return undefined;
  if (typeof method !== "function") throw new ValueStoreError("unavailable");
  return method as Method;
}
