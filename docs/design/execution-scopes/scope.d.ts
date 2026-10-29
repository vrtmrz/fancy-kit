/** Proposed declarations only. No runtime implementation is supplied. */
export type Awaitable<T> = T | PromiseLike<T>;

export interface Scope<T> {
    readonly value: T;
    defer(cleanup: () => Awaitable<void>): void;
}

/** E describes capabilities supplied by the runner, such as cancellation. */
export type ScopedStep<I, O, E extends object = object> = (ctx: Scope<I> & E) => Awaitable<O>;

export interface ScopedProgram<I, O, E extends object = object> {
    (ctx: Scope<I> & E): Awaitable<O>;
    pipe<N>(step: ScopedStep<O, N, E>): ScopedProgram<I, N, E>;
    pipeScoped<N>(step: ScopedStep<O, N, E>): ScopedProgram<I, N, E>;
}

/** Executes one operation and settles after its deferred cleanup. */
export declare function withScope<I, O>(value: I, operation: ScopedStep<I, O>): Promise<O>;

/** Declares a reusable program. Building it does not start any work. */
export declare function scoped<I, E extends object = object>(): ScopedProgram<I, I, E>;
