export * as scope from "./resource/scope.ts";

/**
 * An explicit cleanup capability, independent of standard disposal symbols.
 *
 * The owner calls dispose when the resource's lifetime ends. Implementations
 * must prevent repeated calls from running cleanup more than once. Borrowers
 * use the resource without assuming responsibility for its disposal.
 */
export interface DisposableResource {
    /**
     * Releases owned resources synchronously or returns their cleanup promise.
     * Await the result when cleanup may be asynchronous. Failures propagate;
     * repeated calls must not retry cleanup. Other operations after disposal
     * follow the concrete resource's contract.
     */
    dispose(): void | Promise<void>;
}

/** A value and the explicit cleanup responsibility held by its owner. */
export interface OwnedResource<T> extends DisposableResource {
    /** The original value, which need not have a disposal method of its own. */
    readonly value: T;
}

/**
 * Pairs an existing value with cleanup that runs at most once.
 *
 * @param value - The value whose lifetime the caller owns; its identity is preserved.
 * @param release - Cleanup for this value and its owned dependencies.
 * @returns An ownership wrapper; creating it does not invoke cleanup or modify the value.
 * @remarks
 * The first dispose call invokes release synchronously. Once that call returns,
 * later calls return the same completion promise or undefined, or rethrow the
 * same synchronous failure. A rejected promise is retained without retrying.
 * Reentrant disposal cannot invoke release again.
 *
 * Pass only the value to borrowers and keep the wrapper with the owner. Cleanup
 * must release only owned dependencies. Disposal does not revoke references to
 * the value, flush buffered work, or infer how the value should be closed.
 */
export function createOwnedResource<T>(value: T, release: (value: T) => void | Promise<void>): OwnedResource<T> {
    let disposed = false;
    let completion: void | Promise<void> = undefined;
    let failure: { error: unknown } | undefined;
    return {
        value,
        dispose() {
            if (!disposed) {
                disposed = true;
                try {
                    completion = release(value);
                } catch (error) {
                    failure = { error };
                }
            }
            if (failure) throw failure.error;
            return completion;
        },
    };
}

/**
 * Runs an operation with an owned resource and awaits cleanup in finally.
 *
 * @param resource - An already acquired resource whose lifetime this scope owns.
 * @param operation - Receives the same resource and may return a value or thenable.
 * @returns The operation's result after cleanup completes.
 * @remarks
 * Operation failures still trigger cleanup. A cleanup failure takes precedence
 * over an operation failure, following ordinary finally semantics. The dispose
 * method retains its receiver. This scope does not acquire a resource, flush
 * pending work, or cancel work started outside the operation's returned result.
 * Do not give the same resource to overlapping ownership scopes.
 */
export async function withOwnedResource<TResource extends DisposableResource, TResult>(
    resource: TResource,
    operation: (resource: TResource) => TResult | PromiseLike<TResult>
): Promise<TResult> {
    try {
        return await operation(resource);
    } finally {
        await resource.dispose();
    }
}
