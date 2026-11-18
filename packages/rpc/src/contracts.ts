import type { TransferRequirement } from "./transfer.js";

/** Controls whether a method allows calls, notifications, or result streaming. */
export type RpcMethodKind = "call" | "notify" | "stream";

/** Structural definition of a single RPC method in a shared API contract. */
export interface RpcMethodDescriptor<
  Kind extends RpcMethodKind = RpcMethodKind,
  Args extends readonly unknown[] = readonly unknown[],
  Result = unknown,
  InputTransfer extends TransferRequirement = TransferRequirement,
  OutputTransfer extends TransferRequirement = TransferRequirement,
> {
  /** Invocation kind enforced both statically and at runtime boundaries. */
  readonly kind: Kind;
  /** Input ownership transfer requirement for invocations. */
  readonly inputTransfer: InputTransfer;
  /** Result or stream-item ownership transfer requirement. */
  readonly outputTransfer: OutputTransfer;
  /** Phantom carrier preserving argument and result types. */
  readonly __types?: {
    readonly args: Args;
    readonly result: Result;
  };
}

/** Unary method descriptor supporting `.transfer(...)` configuration. */
export interface CallMethodDescriptor<
  Args extends readonly unknown[] = readonly unknown[],
  Result = void,
  InputTransfer extends TransferRequirement = "none",
  ResultTransfer extends TransferRequirement = "none",
> extends RpcMethodDescriptor<"call", Args, Result, InputTransfer, ResultTransfer> {
  /** Returns a copy of this descriptor with explicit ownership transfer rules. */
  transfer<
    const InT extends TransferRequirement = InputTransfer,
    const OutT extends TransferRequirement = ResultTransfer,
  >(options: {
    readonly input?: InT;
    readonly result?: OutT;
  }): CallMethodDescriptor<Args, Result, InT, OutT>;
}

/** Notification-only descriptor supporting `.transfer(...)` configuration. */
export interface NotifyMethodDescriptor<
  Args extends readonly unknown[] = readonly unknown[],
  InputTransfer extends TransferRequirement = "none",
> extends RpcMethodDescriptor<"notify", Args, void, InputTransfer, "none"> {
  /** Returns a copy of this descriptor with explicit input ownership transfer rules. */
  transfer<const InT extends TransferRequirement = InputTransfer>(options: {
    readonly input?: InT;
  }): NotifyMethodDescriptor<Args, InT>;
}

/** Mapping from method names to method descriptors. */
export type ContractShape = Readonly<Record<string, RpcMethodDescriptor>>;

/** Evaluates to `true` when any method in `C` requires ownership transfer. */
export type ContractRequiresTransfer<C extends ContractShape> = {
  [K in keyof C]: C[K] extends RpcMethodDescriptor<
    RpcMethodKind,
    readonly unknown[],
    unknown,
    infer InT,
    infer OutT
  >
    ? "required" extends InT | OutT
      ? true
      : never
    : never;
}[keyof C] extends never
  ? false
  : true;

/** Evaluates to `true` when any method in `C` uses result streaming. */
export type ContractUsesStreams<C extends ContractShape> = {
  [K in keyof C]: C[K] extends RpcMethodDescriptor<"stream", readonly unknown[], unknown>
    ? true
    : never;
}[keyof C] extends never
  ? false
  : true;

/** Keys in contract `C` eligible for response-bearing `call`. */
export type CallableKeys<C extends ContractShape> = {
  [K in keyof C]: C[K] extends RpcMethodDescriptor<"call"> ? K : never;
}[keyof C];

/** Keys in contract `C` eligible for one-way `notify`. */
export type NotifiableKeys<C extends ContractShape> = {
  [K in keyof C]: C[K] extends RpcMethodDescriptor<"call" | "notify"> ? K : never;
}[keyof C];

/** Keys in contract `C` eligible for `notifyMany` (forbids required transfer). */
export type MultiNotifiableKeys<C extends ContractShape> = {
  [K in keyof C]: C[K] extends RpcMethodDescriptor<
    "call" | "notify",
    readonly unknown[],
    unknown,
    infer InT
  >
    ? "required" extends InT
      ? never
      : K
    : never;
}[keyof C];

function buildDescriptor<
  Kind extends "call" | "notify",
  Args extends readonly unknown[],
  Result,
  InputTransfer extends TransferRequirement,
  OutputTransfer extends TransferRequirement,
>(
  kind: Kind,
  inputTransfer: InputTransfer,
  outputTransfer: OutputTransfer,
): Kind extends "call"
  ? CallMethodDescriptor<Args, Result, InputTransfer, OutputTransfer>
  : NotifyMethodDescriptor<Args, InputTransfer> {
  const descriptor = {
    kind,
    inputTransfer,
    outputTransfer,
    transfer(options: { readonly input?: TransferRequirement; readonly result?: TransferRequirement }) {
      const nextInput = options.input ?? inputTransfer;
      const nextOutput = kind === "call" ? (options.result ?? outputTransfer) : "none";
      return buildDescriptor(kind, nextInput, nextOutput);
    },
  };
  return Object.freeze(descriptor) as unknown as Kind extends "call"
    ? CallMethodDescriptor<Args, Result, InputTransfer, OutputTransfer>
    : NotifyMethodDescriptor<Args, InputTransfer>;
}

/**
 * Declares a unary method supporting both `call` and `notify`.
 *
 * @returns An immutable descriptor defaulting to copy-only input and result.
 */
export function call<
  Args extends readonly unknown[] = readonly [],
  Result = void,
>(): CallMethodDescriptor<Args, Result, "none", "none"> {
  return buildDescriptor<"call", Args, Result, "none", "none">("call", "none", "none");
}

/**
 * Declares a notification-only method that rejects response-bearing calls.
 *
 * @returns An immutable descriptor rejecting `call` invocations.
 */
export function notify<
  Args extends readonly unknown[] = readonly [],
>(): NotifyMethodDescriptor<Args, "none"> {
  return buildDescriptor<"notify", Args, void, "none", "none">("notify", "none", "none");
}

function copyOwnMethodProperties<T extends object>(
  source: T,
  keys: readonly (keyof T)[],
): T {
  const target: Record<PropertyKey, unknown> = {};
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      throw new TypeError(`Contract method "${String(key)}" does not exist.`);
    }
    Object.defineProperty(target, key, {
      value: source[key],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return Object.freeze(target) as T;
}

/**
 * Preserves the exact descriptor types of a shared API contract and freezes
 * the top-level contract mapping without prototype setter side effects.
 *
 * @param methods - Mapping of method names to method descriptors.
 */
export function defineContract<const C extends ContractShape>(methods: C): C {
  return copyOwnMethodProperties(methods, Object.keys(methods) as (keyof C)[]);
}

/**
 * Selects a subset of methods from an existing contract for client binding.
 *
 * @param contract - Source contract containing the methods.
 * @param keys - Exact method names to include in the returned subset.
 * @throws TypeError if a requested key is missing from `contract`.
 */
export function pickContract<
  const C extends ContractShape,
  const K extends keyof C,
>(contract: C, keys: readonly K[]): Pick<C, K> {
  return copyOwnMethodProperties(contract, keys) as Pick<C, K>;
}
