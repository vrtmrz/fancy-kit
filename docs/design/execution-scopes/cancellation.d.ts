/** Proposed declarations only. Requires standard AbortSignal types. */
import type { Scope, ScopedStep } from "./scope.js";

export interface Cancellation {
    readonly signal: AbortSignal;
    isCancelled(): boolean;
}

export type CancellationScope<T> = Scope<T> & Cancellation;

export interface CancellationOptions {
    readonly signal?: AbortSignal;
}

/** Invokes the callback even when already cancelled; preserves its result. */
export declare function withCancellation<I, O>(
    value: I,
    options: CancellationOptions,
    operation: ScopedStep<I, O, Cancellation>
): Promise<O>;
