/** A synchronous value or an awaitable result. */
export type Awaitable<T> = T | PromiseLike<T>;
/** A borrowed value and cleanup registrations owned by one execution. */
export interface Scope<T> {
    /** The supplied value. Object identity and any deliberate sharing are preserved. */
    readonly value: T;
    /**
     * Registers cleanup to run once, in reverse registration order, after the operation settles.
     *
     * Each result is awaited and failures do not skip remaining registrations. Register only
     * resources owned by this execution. Registration after closing has started throws.
     */
    defer(cleanup: () => Awaitable<void>): void;
}
/** An operation which consumes I, produces O, and borrows the supplied capabilities E. */
export type ScopedStep<I, O, E extends object = object> = (ctx: Scope<I> & E) => Awaitable<O>;
/** A reusable operation declaration. Composition itself starts no work. */
export interface ScopedProgram<I, O, E extends object = object> {
    /** Runs the declared steps in the supplied scope, without closing that borrowed scope. */
    (ctx: Scope<I> & E): Awaitable<O>;
    /** Returns a new program whose next step shares this execution's cleanup owner. */
    pipe<N>(step: ScopedStep<O, N, E>): ScopedProgram<I, N, E>;
    /** Returns a new program which closes a child scope before passing its result onward. */
    pipeScoped<N>(step: ScopedStep<O, N, E>): ScopedProgram<I, N, E>;
}
/**
 * Runs one operation and awaits all of its registered cleanup before settling.
 *
 * @param value - A borrowed value, passed without cloning or automatic disposal.
 * @param operation - Receives a fresh scope and may return a value, promise, or thenable.
 * @returns The operation's result after cleanup finishes.
 * @throws The original failure when only the operation or one cleanup fails. Multiple
 * failures produce an AggregateError, with the operation failure first and cleanup
 * failures following in execution order. Failure values, including undefined, are preserved.
 * @remarks
 * Cleanup runs in reverse registration order on success, early return, and failure.
 * Returning an owned resource does not transfer ownership: its registered cleanup still runs.
 * Callers must await or return the work they start; detached promises are not discovered.
 * The scope reads no host globals and has no implicit cancellation behaviour.
 */
export declare function withScope<I, O>(value: I, operation: ScopedStep<I, O>): Promise<O>;
/**
 * Declares an identity program which can be extended with typed steps.
 *
 * @typeParam I - The value supplied when the program is executed.
 * @typeParam E - Capabilities required from the execution context; declaration does not create them.
 * @returns A callable program with immutable pipe and pipeScoped composition methods.
 * @remarks
 * pipe shares the current cleanup owner. pipeScoped owns cleanup for its step and
 * awaits that cleanup before the next step. Every step receives a stable value view;
 * its result becomes the next value without implicit merging. Undefined is ordinary
 * data, and cancellation observation does not automatically skip steps. Rejected
 * steps skip later steps, leaving the runner to perform the current scope's cleanup.
 * Declaration and composition acquire no resources and start no asynchronous work.
 */
export declare function scoped<I, E extends object = object>(): ScopedProgram<I, I, E>;
