import { iterate } from "./scoped.iteration.runner.internal.ts";
import { type Awaitable, type Scope } from "../resource/scope.ts";

/** A shared scope with optional cooperative cancellation observation. */
export type IterationScope = Scope<unknown> & {
    /** Reports cancellation of the operation which owns the iteration. */
    isCancelled?(): boolean;
};

/** Admission limits for one iteration. */
export interface IterationOptions {
    /** Positive safe integer; defaults to one. Each item's cleanup occupies its slot. */
    readonly concurrency?: number;
}

/** Counts invoked callbacks, rather than application-level successful operations. */
export type IterationResult =
    | { readonly status: "completed"; readonly started: number }
    | { readonly status: "cancelled"; readonly started: number };

/** Returned values of started callbacks, ordered by their input index. */
export type IterationMapResult<R> =
    | { readonly status: "completed"; readonly values: readonly R[] }
    | { readonly status: "cancelled"; readonly values: readonly R[] };

/**
 * Runs items in separate child scopes with bounded concurrency.
 *
 * @param parent - The shared value and capabilities borrowed by each item scope.
 * @param items - Input pulled sequentially. Each yielded value is awaited before dispatch.
 * @param options - A positive concurrency bound, including item cleanup; defaults to one.
 * @param operation - Receives an item, its own cleanup context, and the zero-based input index.
 * @returns Completion or cancellation status and the number of callbacks invoked.
 * @remarks
 * The caller must await or return this promise before the parent scope ends. Each
 * child finishes cleanup before releasing its concurrency slot. Cancellation stops
 * new admission without discarding already started work or its errors. An uncaught
 * failure also stops admission; siblings finish without being forcibly cancelled.
 * A pending iterator pull or yielded promise is awaited before early iterator closure.
 * All started item scopes and iterator cleanup settle before this promise settles.
 * Single failures preserve identity. Multiple failures use AggregateError, ordered
 * by input failure, item index, and iterator-close failure. Callback return values
 * are discarded and do not determine application-level success or cancellation.
 */
export function forEachInScope<S extends IterationScope, I>(
    parent: S,
    items: Iterable<I> | AsyncIterable<I>,
    options: IterationOptions,
    operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<unknown>
): Promise<IterationResult> {
    return iterate(parent, items, options, operation, () => {});
}

/**
 * Maps items in separate child scopes and returns results in input order.
 *
 * @param parent - The shared value and capabilities borrowed by each item scope.
 * @param items - Sequentially pulled synchronous or asynchronous input; yielded values are awaited.
 * @param options - A positive concurrency bound, including item cleanup; defaults to one.
 * @param operation - Produces one value using the item's context and zero-based input index.
 * @returns An explicit completion or cancellation result. Cancelled values cover
 * the started input prefix; unstarted items have no placeholders. Undefined remains data.
 * @remarks
 * Admission, child cleanup, iterator closure, and error handling follow forEachInScope.
 * Started callbacks are awaited even after cancellation. If any fails, the operation
 * rejects after drainage instead of returning a partial success. Returned objects are
 * not cloned, and returning a resource does not transfer its deferred ownership.
 */
export async function mapInScope<S extends IterationScope, I, R>(
    parent: S,
    items: Iterable<I> | AsyncIterable<I>,
    options: IterationOptions,
    operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<R>
): Promise<IterationMapResult<R>> {
    const values: R[] = [];
    const result = await iterate(parent, items, options, operation, (index, value) => {
        values[index] = value;
    });
    return result.status === "cancelled" ? { status: "cancelled", values } : { status: "completed", values };
}
