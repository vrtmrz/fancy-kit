/** Proposed declarations only. No DOM or Node types are required. */
import type { Awaitable, Scope } from "./scope.js";

export type IterationScope = Scope<unknown> & {
    isCancelled?(): boolean;
};

export interface IterationOptions {
    /** Positive safe integer; defaults to one. Includes item cleanup time. */
    readonly concurrency?: number;
}

/** Counts started callbacks, not domain-level successful operations. */
export type IterationResult =
    | { readonly status: "completed"; readonly started: number }
    | { readonly status: "cancelled"; readonly started: number };

/** Values come from started callbacks and are ordered by their input index. */
export type IterationMapResult<R> =
    | { readonly status: "completed"; readonly values: readonly R[] }
    | { readonly status: "cancelled"; readonly values: readonly R[] };

export declare function forEachInScope<S extends IterationScope, I>(
    parent: S,
    items: Iterable<I> | AsyncIterable<I>,
    options: IterationOptions,
    operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<unknown>
): Promise<IterationResult>;

export declare function mapInScope<S extends IterationScope, I, R>(
    parent: S,
    items: Iterable<I> | AsyncIterable<I>,
    options: IterationOptions,
    operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<R>
): Promise<IterationMapResult<R>>;
