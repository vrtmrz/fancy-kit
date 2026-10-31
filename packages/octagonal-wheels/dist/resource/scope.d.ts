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
/** A reusable pipeline declaration. Composition itself starts no work. */
export interface ScopedPipeline<I, O, E extends object = object> {
    /** Runs the declared steps in the supplied scope, without closing that borrowed scope. */
    (ctx: Scope<I> & E): Awaitable<O>;
    /** Returns a new pipeline whose next step shares this execution's cleanup owner. */
    pipe<N>(step: ScopedStep<O, N, E>): ScopedPipeline<I, N, E>;
    /**
     * Returns a new pipeline which closes a child scope before passing its result onward.
     *
     * @example
     * ```ts
     * interface Reader {
     *     read(): Promise<string>;
     *     close(): Promise<void>;
     * }
     * declare function openReader(path: string): Promise<Reader>;
     * declare function analyse(contents: string): { words: number };
     * declare const path: string;
     *
     * const inspect = scoped<string>()
     *     .pipeScoped(async (ctx) => {
     *         const reader = await openReader(ctx.value);
     *         ctx.defer(() => reader.close());
     *         return await reader.read();
     *     })
     *     .pipe((ctx) => analyse(ctx.value));
     * const report = withScope(path, inspect);
     * ```
     *
     * The reader closes before analysis starts; cleanup registered by ordinary
     * steps remains owned by the enclosing scope until the whole pipeline ends.
     */
    pipeScoped<N>(step: ScopedStep<O, N, E>): ScopedPipeline<I, N, E>;
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
 *
 * @example
 * ```ts
 * interface Reader {
 *     read(): Promise<string>;
 *     close(): Promise<void>;
 * }
 * declare function openReader(path: string): Promise<Reader>;
 *
 * async function readFile(path: string): Promise<string> {
 *     return await withScope(path, async (ctx) => {
 *         const reader = await openReader(ctx.value);
 *         ctx.defer(() => reader.close());
 *         return await reader.read();
 *     });
 * }
 * ```
 *
 * The returned value is available only after the reader has closed.
 */
export declare function withScope<I, O>(value: I, operation: ScopedStep<I, O>): Promise<O>;
/**
 * Declares an identity pipeline which can be extended with typed steps.
 *
 * @typeParam I - The value supplied when the pipeline is executed.
 * @typeParam E - Capabilities required from the execution context; declaration does not create them.
 * @returns A callable pipeline with immutable pipe and pipeScoped composition methods.
 * @remarks
 * pipe shares the current cleanup owner. pipeScoped owns cleanup for its step and
 * awaits that cleanup before the next step. Every step receives a stable value view;
 * its result becomes the next value without implicit merging. Undefined is ordinary
 * data, and cancellation observation does not automatically skip steps. Rejected
 * steps skip later steps, leaving the runner to perform the current scope's cleanup.
 * Declaration and composition acquire no resources and start no asynchronous work.
 *
 * @example
 * ```ts
 * interface Reader {
 *     read(): Promise<string>;
 *     close(): Promise<void>;
 * }
 * declare function acquirePermit(): () => void;
 * declare function openReader(path: string): Promise<Reader>;
 * declare function analyse(contents: string): { words: number };
 * declare const path: string;
 *
 * const inspect = scoped<string>()
 *     .pipe((ctx) => {
 *         ctx.defer(acquirePermit());
 *         return ctx.value;
 *     })
 *     .pipeScoped(async (ctx) => {
 *         const reader = await openReader(ctx.value);
 *         ctx.defer(() => reader.close());
 *         return await reader.read();
 *     })
 *     .pipe((ctx) => analyse(ctx.value));
 * const report = withScope(path, inspect);
 * ```
 *
 * The permit remains held through analysis; the reader closes before analysis
 * starts. The returned pipeline can be reused by another `withScope` call.
 */
export declare function scoped<I, E extends object = object>(): ScopedPipeline<I, I, E>;
