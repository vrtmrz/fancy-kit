import { type Awaitable } from "../resource/scope.ts";
import type { IterationOptions, IterationResult, IterationScope } from "./scoped.iteration.ts";
export declare function iterate<S extends IterationScope, I, R>(parent: S, items: Iterable<I> | AsyncIterable<I>, options: IterationOptions, operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<R>, collect: (index: number, value: R) => void): Promise<IterationResult>;
