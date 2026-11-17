/** Whether a method input, result, or stream item requires ownership transfer. */
export type TransferRequirement = "none" | "optional" | "required";

declare const transferBrand: unique symbol;
const transferMarker = Symbol("@vrtmrz/rpc/withTransfer");

/**
 * Local wrapper attaching explicit transferable resources to a value.
 *
 * Creating this descriptor performs no transfer or copying. Codecs receive the
 * unwrapped payload value and must not detach resources; the transport send
 * boundary transfers the listed resources and verifies reachability after
 * encoding.
 */
export interface WithTransfer<T, Resource = object> {
  readonly [transferBrand]: true;
  /** Unwrapped payload value transmitted to the remote peer. */
  readonly value: T;
  /** Explicit resources to transfer at the transport send boundary. */
  readonly resources: readonly Resource[];
}

interface InternalWithTransfer<T, Resource> extends WithTransfer<T, Resource> {
  readonly [transferMarker]: true;
}

/**
 * Wraps a value with an explicit list of resources for ownership transfer.
 *
 * @param value - Payload value whose encoded form must retain the resources.
 * @param resources - Resources whose ownership is transferred upon send.
 * @returns An immutable transfer descriptor holding the value and resources.
 */
export function withTransfer<T, Resource = object>(
  value: T,
  resources: readonly Resource[],
): WithTransfer<T, Resource> {
  const snapshot = Object.freeze(Array.from(resources));
  const descriptor: Record<PropertyKey, unknown> = {
    value,
    resources: snapshot,
  };
  Object.defineProperty(descriptor, transferMarker, {
    value: true,
    enumerable: false,
  });
  return Object.freeze(descriptor) as unknown as InternalWithTransfer<T, Resource>;
}

/**
 * Checks whether `candidate` was created by {@link withTransfer}.
 *
 * @param candidate - Unknown argument or return value.
 */
export function isWithTransfer(
  candidate: unknown,
): candidate is WithTransfer<unknown, unknown> {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    transferMarker in candidate &&
    (candidate as Record<symbol, unknown>)[transferMarker] === true
  );
}

/** Extracts the logical value type when `T` may be wrapped with `WithTransfer`. */
export type UnwrapTransfer<T> = T extends WithTransfer<infer V, unknown> ? V : T;

/** Maps an argument tuple so any position may carry an explicit transfer wrapper. */
export type AllowTransferInArgs<
  Args extends readonly unknown[],
  Resource,
> = {
  readonly [K in keyof Args]: Args[K] | WithTransfer<Args[K], Resource>;
};

/**
 * Evaluates to `true` when tuple or array type `T` contains at least one element
 * carrying {@link WithTransfer}.
 */
export type TupleContainsTransfer<T extends readonly unknown[]> =
  Extract<T[number], WithTransfer<unknown, unknown>> extends never ? false : true;

type NonEmptyAllowTransferTuple<
  Args extends readonly unknown[],
  Resource,
> = Args extends readonly [infer Head, ...infer Tail]
  ? readonly [Head | WithTransfer<Head, Resource>, ...AllowTransferInArgs<Tail, Resource>]
  : Args extends readonly [(infer _Opt)?, ...infer Tail]
    ? readonly [
        Required<Args>[0] | WithTransfer<Required<Args>[0], Resource>,
        ...AllowTransferInArgs<Tail, Resource>,
      ]
    : Args extends readonly (infer Elem)[]
      ? readonly [
          Elem | WithTransfer<Elem, Resource>,
          ...(readonly (Elem | WithTransfer<Elem, Resource>)[]),
        ]
      : never;

/**
 * Maps an argument tuple so at least one supplied argument carries `WithTransfer`.
 * Supports fixed, optional-element, and rest-element tuples; produces `never`
 * only for empty `readonly []` tuples.
 *
 * For variadic rest tuples, {@link TupleContainsTransfer} enforces at call sites
 * that at least one element in any position carries `WithTransfer`.
 */
export type RequireTransferInArgs<
  Args extends readonly unknown[],
  Resource,
> = Args extends readonly []
  ? never
  : number extends Args["length"]
    ? NonEmptyAllowTransferTuple<Args, Resource>
    : Args extends readonly [infer Head, ...infer Tail]
      ?
          | readonly [WithTransfer<Head, Resource>, ...AllowTransferInArgs<Tail, Resource>]
          | (Tail extends readonly []
              ? never
              : readonly [
                  Head | WithTransfer<Head, Resource>,
                  ...RequireTransferInArgs<Tail, Resource>,
                ])
      : Args extends readonly [(infer _Opt)?, ...infer Tail]
        ?
            | readonly [
                WithTransfer<Required<Args>[0], Resource>,
                ...AllowTransferInArgs<Tail, Resource>,
              ]
            | (Tail extends readonly []
                ? never
                : readonly [
                    (Required<Args>[0] | WithTransfer<Required<Args>[0], Resource>)?,
                    ...RequireTransferInArgs<Tail, Resource>,
                  ])
        : never;

/** Resolves the caller-side argument tuple from a method's input transfer rule. */
export type ClientArgs<
  Args extends readonly unknown[],
  InputTransfer extends TransferRequirement,
  Resource,
> = InputTransfer extends "required"
  ? RequireTransferInArgs<Args, Resource>
  : InputTransfer extends "optional"
    ? AllowTransferInArgs<Args, Resource>
    : Args;

/** Resolves the handler-side return type from a method's result transfer rule. */
export type HandlerResult<
  Result,
  ResultTransfer extends TransferRequirement,
  Resource,
> = ResultTransfer extends "required"
  ? WithTransfer<Result, Resource>
  : ResultTransfer extends "optional"
    ? Result | WithTransfer<Result, Resource>
    : Result;
