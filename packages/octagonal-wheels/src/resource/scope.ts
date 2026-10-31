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

function valueView<T, E extends object>(parent: E, value: T, defer?: Scope<T>["defer"]): Scope<T> & E {
    const view = Object.create(parent) as Scope<T> & E;
    Object.defineProperty(view, "value", { value, enumerable: true });
    if (defer !== undefined) {
        Object.defineProperty(view, "defer", { value: defer, enumerable: true });
    }
    return view;
}

async function runScope<I, O, E extends object>(parent: E, value: I, operation: ScopedStep<I, O, E>): Promise<O> {
    let state: "running" | "closing" | "closed" = "running";
    const cleanup: (() => Awaitable<void>)[] = [];
    const failures: unknown[] = [];
    let result!: O;
    const context = valueView(parent, value, (callback) => {
        if (state !== "running") throw new Error("The execution scope is already closing or closed.");
        if (typeof callback !== "function") throw new TypeError("Scope cleanup must be a function.");
        cleanup.push(callback);
    });

    try {
        result = await operation(context);
    } catch (error) {
        failures.push(error);
    }
    state = "closing";
    try {
        while (cleanup.length > 0) {
            const release = cleanup.pop()!;
            try {
                await release();
            } catch (error) {
                failures.push(error);
            }
        }
    } finally {
        state = "closed";
        cleanup.length = 0;
    }

    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) throw new AggregateError(failures, "Multiple failures occurred in the execution scope.");
    return result;
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
export function withScope<I, O>(value: I, operation: ScopedStep<I, O>): Promise<O> {
    return runScope({}, value, operation);
}

interface PipelineStep {
    readonly child: boolean;
    readonly operation: ScopedStep<unknown, unknown>;
}

function pipelineWithSteps<I, O, E extends object>(steps: readonly PipelineStep[]): ScopedPipeline<I, O, E> {
    const execute = async (context: Scope<I> & E): Promise<O> => {
        let value: unknown = context.value;
        for (const step of steps) {
            value = step.child
                ? await runScope(context, value, step.operation)
                : await step.operation(valueView(context, value));
        }
        return value as O;
    };
    const append = <N>(step: ScopedStep<O, N, E>, child: boolean): ScopedPipeline<I, N, E> =>
        pipelineWithSteps<I, N, E>([
            ...steps,
            // The public pipe signature checks this boundary before values are erased for execution.
            { child, operation: step as unknown as ScopedStep<unknown, unknown> },
        ]);
    return Object.assign(execute, {
        pipe: <N>(step: ScopedStep<O, N, E>) => append(step, false),
        pipeScoped: <N>(step: ScopedStep<O, N, E>) => append(step, true),
    });
}

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
export function scoped<I, E extends object = object>(): ScopedPipeline<I, I, E> {
    return pipelineWithSteps<I, I, E>([]);
}
