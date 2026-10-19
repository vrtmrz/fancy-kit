import type { ObjectValue } from "./contracts.js";
import { LocalStorageError } from "./errors.js";

type LocalValueErrorCode = "invalid-value" | "invalid-data";
type ObjectValueErrorCode = "invalid-value" | "invalid-data";

/** Requires a string key without changing its contents. */
export function validateLocalKey(key: unknown): asserts key is string {
  if (typeof key !== "string") {
    throw new LocalStorageError("invalid-key");
  }
}

/** Requires a string raw or logical value. */
export function validateLocalValue(
  value: unknown,
  code: LocalValueErrorCode = "invalid-value",
): asserts value is string {
  if (typeof value !== "string") {
    throw new LocalStorageError(code);
  }
}

/**
 * Requires a supported JSON value without invoking getters or `toJSON`.
 *
 * @param value - The value to inspect.
 * @param code - The fixed error category for an invalid input or stored value.
 */
export function validateObjectValue(
  value: unknown,
  code: ObjectValueErrorCode = "invalid-value",
): asserts value is ObjectValue {
  inspectObjectValue(value, false, code);
}

/** Creates a detached copy using JSON-value semantics and ordinary prototypes. */
export function cloneObjectValue(value: unknown): ObjectValue {
  return inspectObjectValue(value, true, "invalid-value", true);
}

/** Creates a JSON encoding snapshot without inherited getters or toJSON hooks. */
export function snapshotObjectValue(value: unknown): ObjectValue {
  return inspectObjectValue(value, true, "invalid-value");
}

/** Requires a string prefix; prefixes are literal and the empty string is valid. */
export function validateLocalPrefix(prefix: unknown): asserts prefix is string {
  if (typeof prefix !== "string") {
    throw new LocalStorageError("invalid-value");
  }
}

type Child = { key: number | string; value: unknown };
type VisitTask = { value: unknown; assign: (copy: ObjectValue) => void };
type LeaveTask = { leave: object };
type Task = VisitTask | LeaveTask;

function inspectObjectValue(
  root: unknown,
  clone: boolean,
  code: ObjectValueErrorCode,
  ordinaryPrototypes = false,
): ObjectValue {
  try {
    const active = new WeakSet<object>();
    const pending: Task[] = [];
    let result: ObjectValue = null;
    pending.push({ value: root, assign: (copy) => { result = copy; } });

    while (pending.length > 0) {
      const task = pending.pop();
      if (task === undefined) {
        throw new Error();
      }
      if ("leave" in task) {
        active.delete(task.leave);
        continue;
      }

      const value = task.value;
      if (value === null || typeof value === "string" || typeof value === "boolean") {
        task.assign(value);
        continue;
      }
      if (typeof value === "number") {
        if (!Number.isFinite(value)) {
          throw new Error();
        }
        task.assign(clone && Object.is(value, -0) ? 0 : value);
        continue;
      }
      if (typeof value !== "object") {
        throw new Error();
      }

      const object = value as object;
      if (active.has(object)) {
        throw new Error();
      }
      const children = readChildren(object);
      let copy = value as ObjectValue;
      if (clone) {
        if (children.kind === "array") {
          copy = ordinaryPrototypes ? [] : createArraySnapshot();
        } else {
          copy = ordinaryPrototypes ? {} : Object.create(null) as { [key: string]: ObjectValue };
        }
      }
      task.assign(copy);

      active.add(object);
      pending.push({ leave: object });
      for (let index = children.entries.length - 1; index >= 0; index -= 1) {
        const child = children.entries[index];
        if (child === undefined) {
          throw new Error();
        }
        pending.push({
          value: child.value,
          assign: clone
            ? (childCopy) => assignChild(copy, child.key, childCopy)
            : () => undefined,
        });
      }
    }

    return result;
  } catch {
    // Hide proxy traps and structural inspection failures behind the fixed code.
    throw new LocalStorageError(code);
  }
}

function readChildren(
  value: object,
): { kind: "array" | "record"; entries: Child[] } {
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      throw new Error();
    }
    const array = value as unknown[];
    const length = array.length;
    const keys = Reflect.ownKeys(array);
    if (keys.length !== length + 1) {
      throw new Error();
    }

    const values = new Array<unknown>(length);
    for (const key of keys) {
      if (key === "length") {
        continue;
      }
      if (typeof key !== "string") {
        throw new Error();
      }
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) {
        throw new Error();
      }
      const descriptor = Object.getOwnPropertyDescriptor(array, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new Error();
      }
      values[index] = descriptor.value;
    }

    const entries: Child[] = [];
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(values, index)) {
        throw new Error();
      }
      entries.push({ key: index, value: values[index] });
    }
    return { kind: "array", entries };
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error();
  }
  const keys = Reflect.ownKeys(value);
  const entries: Child[] = [];
  for (const key of keys) {
    if (typeof key !== "string") {
      throw new Error();
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new Error();
    }
    entries.push({ key, value: descriptor.value });
  }
  return { kind: "record", entries };
}

function assignChild(parent: ObjectValue, key: number | string, value: ObjectValue): void {
  if (Array.isArray(parent)) {
    if (typeof key !== "number") {
      throw new Error();
    }
    Object.defineProperty(parent, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    return;
  }
  if (typeof key !== "string" || parent === null || typeof parent !== "object") {
    throw new Error();
  }
  Object.defineProperty(parent, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function createArraySnapshot(): ObjectValue[] {
  const copy: ObjectValue[] = [];
  Object.setPrototypeOf(copy, null);
  return copy;
}
