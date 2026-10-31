import { withScope, type Scope, type ScopedStep } from "../resource/scope.ts";

/**
 * Cancellation capabilities supplied by a cancellation-aware operation.
 *
 * Child scopes borrow these capabilities. Closing a child scope does not abort
 * the signal; the withCancellation invocation which created it owns that signal.
 */
export interface Cancellation {
    /** The signal owned by the surrounding withCancellation invocation. */
    readonly signal: AbortSignal;
    /** Reports whether the owned signal has been aborted. */
    isCancelled(): boolean;
}

/** A scope value combined with borrowed cancellation observation. */
export type CancellationScope<T> = Scope<T> & Cancellation;

/** Options controlling how a cancellation scope is linked to its caller. */
export interface CancellationOptions {
    /**
     * Optional parent signal. Its abort reason is forwarded to the owned signal.
     * The parent signal is observed but is never aborted by this wrapper.
     */
    readonly signal?: AbortSignal;
}

/**
 * Runs an operation in a scope with its own cancellation signal.
 *
 * A fresh controller is created for each invocation. If a parent signal is
 * supplied, its abort is forwarded with the same reason. The operation is
 * invoked even when the parent is already aborted, allowing it to return a
 * partial or application-specific cancellation result.
 *
 * Cancellation does not reject this promise, skip the operation, replace its
 * result, or discard its errors. The wrapper waits for the operation and all
 * deferred cleanup to settle. User cleanup runs before the parent listener is
 * removed and the owned signal is aborted. A parent abort during cleanup is
 * still forwarded promptly.
 *
 * @typeParam I - The input value shared with the operation.
 * @typeParam O - The operation result.
 * @param value - The value exposed as the scope value.
 * @param options - Optional parent cancellation signal.
 * @param operation - Work which receives the scope and cancellation capability.
 * @returns The operation result after deferred cleanup has settled.
 */
export function withCancellation<I, O>(
    value: I,
    options: CancellationOptions,
    operation: ScopedStep<I, O, Cancellation>
): Promise<O> {
    const controller = new AbortController();
    const parentSignal = options.signal;

    return withScope<I, O>(value, (scope) => {
        let unsubscribeParent = () => {};

        // Registration order gives cleanup order: unsubscribe, then abort.
        // User registrations made by operation run before both.
        scope.defer(() => controller.abort());
        scope.defer(() => unsubscribeParent());

        if (parentSignal) {
            const abortFromParent = () => controller.abort(parentSignal.reason);
            if (parentSignal.aborted) {
                abortFromParent();
            } else {
                parentSignal.addEventListener("abort", abortFromParent, { once: true });
                unsubscribeParent = () => parentSignal.removeEventListener("abort", abortFromParent);

                // Recheck after registration so an abort cannot be missed by a
                // signal implementation which changes state during registration.
                if (parentSignal.aborted) abortFromParent();
            }
        }

        const context: CancellationScope<I> = {
            value: scope.value,
            defer: (cleanup) => scope.defer(cleanup),
            signal: controller.signal,
            isCancelled: () => controller.signal.aborted,
        };
        return operation(context);
    });
}
