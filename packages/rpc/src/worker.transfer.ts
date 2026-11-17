import { RpcError } from "./RpcError.js";
import type {
  WorkerReachabilityOptions,
  WorkerTransferPort,
  WorkerTransferProfile,
} from "./worker.types.js";

type IntrinsicGetter = ((this: unknown) => unknown) | undefined;

function getOwnGetter(
  proto: object | null | undefined,
  key: PropertyKey,
): IntrinsicGetter {
  if (!proto) return undefined;
  return Object.getOwnPropertyDescriptor(proto, key)?.get as IntrinsicGetter;
}

function callGetter(getter: IntrinsicGetter, target: object): unknown {
  return getter ? getter.call(target) : undefined;
}

function hasInternalSlot(getter: IntrinsicGetter, target: object): boolean {
  if (!getter) return false;
  try {
    getter.call(target);
    return true;
  } catch {
    return false;
  }
}

const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const arrayBufferPrototype = ArrayBuffer.prototype;
const dataViewPrototype = DataView.prototype;

const arrayBufferByteLengthGetter = getOwnGetter(
  arrayBufferPrototype,
  "byteLength",
);
const arrayBufferDetachedGetter = getOwnGetter(
  arrayBufferPrototype,
  "detached",
);
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as
  object | null;
const typedArrayBufferGetter = getOwnGetter(typedArrayPrototype, "buffer");
const dataViewBufferGetter = getOwnGetter(dataViewPrototype, "buffer");

const standardViewPrototypes = new Set<object>([
  dataViewPrototype,
  Int8Array.prototype,
  Uint8Array.prototype,
  Uint8ClampedArray.prototype,
  Int16Array.prototype,
  Uint16Array.prototype,
  Int32Array.prototype,
  Uint32Array.prototype,
  Float32Array.prototype,
  Float64Array.prototype,
  BigInt64Array.prototype,
  BigUint64Array.prototype,
]);

const optionalFloat16Array = (
  globalThis as { readonly Float16Array?: { readonly prototype?: unknown } }
).Float16Array;
if (
  typeof optionalFloat16Array === "function" &&
  typeof optionalFloat16Array.prototype === "object" &&
  optionalFloat16Array.prototype !== null
) {
  standardViewPrototypes.add(optionalFloat16Array.prototype);
}

export function resolveTransferProfile(profile: unknown): WorkerTransferProfile {
  if (profile === undefined || profile === "binary-data") {
    return "binary-data";
  }
  if (profile === "binary-data-and-ports") {
    return "binary-data-and-ports";
  }
  throw new RpcError(
    "unsupported-profile",
    `Unsupported Worker transfer profile "${String(profile)}".`,
  );
}

function isLocalArrayBuffer(
  value: unknown,
  knownProto?: object | null,
): value is ArrayBuffer {
  if (typeof value !== "object" || value === null) return false;
  const proto =
    knownProto !== undefined
      ? knownProto
      : (Object.getPrototypeOf(value) as object | null);
  return (
    proto === arrayBufferPrototype &&
    hasInternalSlot(arrayBufferByteLengthGetter, value)
  );
}

function isDetachedBuffer(buffer: ArrayBuffer): boolean {
  if (arrayBufferDetachedGetter) {
    return callGetter(arrayBufferDetachedGetter, buffer) === true;
  }
  return (buffer as { readonly detached?: boolean }).detached === true;
}

function getGlobalMessagePortConstructor():
  (abstract new (...args: never[]) => object) | undefined {
  const ctor = (
    globalThis as {
      readonly MessagePort?: abstract new (...args: never[]) => object;
    }
  ).MessagePort;
  return typeof ctor === "function" ? ctor : undefined;
}

function isLocalMessagePort(
  value: unknown,
  knownProto?: object | null,
): boolean {
  if (typeof value !== "object" || value === null) return false;
  const ctor = getGlobalMessagePortConstructor();
  if (!ctor || typeof ctor.prototype !== "object" || ctor.prototype === null) {
    return false;
  }
  const proto =
    knownProto !== undefined
      ? knownProto
      : (Object.getPrototypeOf(value) as object | null);
  return proto === ctor.prototype && value instanceof ctor;
}

function getIntrinsicViewBuffer(
  view: ArrayBufferView,
  isDataView: boolean,
): unknown {
  return callGetter(
    isDataView ? dataViewBufferGetter : typedArrayBufferGetter,
    view,
  );
}

function inspectContainerProperties(target: object, stack: unknown[]): void {
  for (const key of Reflect.ownKeys(target)) {
    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (!desc) continue;
    if (desc.get !== undefined || desc.set !== undefined) {
      throw new RpcError(
        "transfer-failed",
        `Accessor property "${String(key)}" is not supported in transfer payloads.`,
      );
    }
    if (typeof key === "string" && desc.enumerable) {
      stack.push(desc.value);
    }
  }
}

function validateAndCollectReachable(
  root: unknown,
  profile: WorkerTransferProfile,
  designated: ReadonlySet<object>,
): Set<object> {
  const visited = new Set<object>();
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || current === null) continue;
    const valueType = typeof current;
    if (
      valueType === "boolean" ||
      valueType === "number" ||
      valueType === "string" ||
      valueType === "bigint"
    ) {
      continue;
    }
    if (valueType !== "object") {
      throw new RpcError(
        "transfer-failed",
        `Unsupported "${valueType}" value in payload with ownership transfer.`,
      );
    }

    const obj = current as object;
    if (visited.has(obj)) continue;
    visited.add(obj);

    const proto = Object.getPrototypeOf(obj) as object | null;

    if (proto === objectPrototype || proto === null) {
      if (obj === objectPrototype) {
        throw new RpcError(
          "transfer-failed",
          "Object.prototype is not a supported data record in transfer payloads.",
        );
      }
      inspectContainerProperties(obj, stack);
      continue;
    }

    if (proto === arrayPrototype) {
      if (!Array.isArray(obj)) {
        throw new RpcError(
          "transfer-failed",
          "Object inheriting from Array.prototype without Array semantics is not supported in transfer payloads.",
        );
      }
      inspectContainerProperties(obj, stack);
      continue;
    }

    if (proto === arrayBufferPrototype) {
      if (!hasInternalSlot(arrayBufferByteLengthGetter, obj)) {
        throw new RpcError(
          "transfer-failed",
          "Custom object inheriting from ArrayBuffer.prototype is not supported in transfer payloads.",
        );
      }
      continue;
    }

    if (proto !== null && standardViewPrototypes.has(proto)) {
      if (!ArrayBuffer.isView(obj)) {
        throw new RpcError(
          "transfer-failed",
          "Custom object inheriting from binary view prototype is not supported in transfer payloads.",
        );
      }
      if (Object.getOwnPropertyDescriptor(obj, "buffer") !== undefined) {
        throw new RpcError(
          "transfer-failed",
          'Custom own "buffer" property on binary view is not supported in transfer payloads.',
        );
      }
      const backingBuffer = getIntrinsicViewBuffer(
        obj,
        proto === dataViewPrototype,
      );
      if (!isLocalArrayBuffer(backingBuffer)) {
        throw new RpcError(
          "transfer-failed",
          "Binary view in transfer payload must be backed by a local ArrayBuffer.",
        );
      }
      visited.add(backingBuffer);
      continue;
    }

    if (profile === "binary-data-and-ports" && isLocalMessagePort(obj, proto)) {
      if (!designated.has(obj)) {
        throw new RpcError(
          "transfer-failed",
          'Reachable MessagePort under "binary-data-and-ports" must be designated for transfer.',
        );
      }
      continue;
    }

    throw new RpcError(
      "transfer-failed",
      `Unsupported container or host object encountered under "${profile}" transfer profile.`,
    );
  }

  return visited;
}

function validateTransferResources(
  resources: readonly unknown[],
  profile: WorkerTransferProfile,
): Set<object> {
  const seen = new Set<object>();
  for (const resource of resources) {
    if (isLocalArrayBuffer(resource)) {
      if (isDetachedBuffer(resource)) {
        throw new RpcError(
          "transfer-failed",
          "Designated ArrayBuffer is already detached.",
        );
      }
    } else if (
      profile === "binary-data-and-ports" &&
      isLocalMessagePort(resource)
    ) {
      // Valid local MessagePort candidate; platform postMessage performs final port state validation.
    } else {
      throw new RpcError(
        "transfer-failed",
        profile === "binary-data-and-ports"
          ? 'Unsupported transferable resource; designate a local ArrayBuffer or MessagePort under "binary-data-and-ports".'
          : 'Unsupported transferable resource; default "binary-data" profile permits local ArrayBuffer instances only.',
      );
    }

    const obj = resource as object;
    if (seen.has(obj)) {
      throw new RpcError(
        "transfer-failed",
        "Duplicate transferable resource in transfer list.",
      );
    }
    seen.add(obj);
  }
  return seen;
}

/**
 * Verifies that `payload` conforms to the selected Worker transfer profile and
 * that every designated resource is valid, unique, non-detached (where
 * observable), and reachable by identity from `payload`.
 *
 * When `resources` is empty, no profile traversal runs so copy-only sends
 * retain platform structured-clone behaviour.
 */
export function assertReachableTransferables(
  payload: unknown,
  resources: readonly ArrayBuffer[],
  options?: WorkerReachabilityOptions<"binary-data">,
): readonly ArrayBuffer[];
export function assertReachableTransferables(
  payload: unknown,
  resources: readonly (ArrayBuffer | WorkerTransferPort)[],
  options: WorkerReachabilityOptions<"binary-data-and-ports"> & {
    readonly transferProfile: "binary-data-and-ports";
  },
): readonly (ArrayBuffer | WorkerTransferPort)[];
export function assertReachableTransferables(
  payload: unknown,
  resources: readonly (ArrayBuffer | WorkerTransferPort)[],
  options?: WorkerReachabilityOptions<WorkerTransferProfile>,
): readonly (ArrayBuffer | WorkerTransferPort)[] {
  return assertReachableTransferablesInternal(
    payload,
    resources,
    resolveTransferProfile(options?.transferProfile),
  );
}

export function assertReachableTransferablesInternal(
  payload: unknown,
  resources: readonly (ArrayBuffer | WorkerTransferPort)[],
  profile: WorkerTransferProfile,
): readonly (ArrayBuffer | WorkerTransferPort)[] {
  if (resources.length === 0) {
    return resources;
  }

  const designated = validateTransferResources(resources, profile);
  const reachable = validateAndCollectReachable(payload, profile, designated);
  for (const resource of designated) {
    if (!reachable.has(resource)) {
      throw new RpcError(
        "transfer-failed",
        "Designated transferable resource is not reachable from the encoded payload.",
      );
    }
  }

  return resources;
}
