import { scoped, type Awaitable } from "../resource/scope.ts";
import type { IterationOptions, IterationResult, IterationScope } from "./scoped.iteration.ts";

interface InputIterator<I> {
    next(): Awaitable<IteratorResult<I>>;
    return?(): Awaitable<IteratorResult<I>>;
}

function getInputIterator<I>(items: Iterable<I> | AsyncIterable<I>): InputIterator<I> {
    const asyncFactory = (items as Partial<AsyncIterable<I>>)[Symbol.asyncIterator];
    return asyncFactory === undefined || asyncFactory === null
        ? (items as Iterable<I>)[Symbol.iterator]()
        : asyncFactory.call(items);
}

function throwIterationFailures(failures: readonly unknown[]): void {
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) throw new AggregateError(failures, "Multiple failures occurred during scoped iteration.");
}

export async function iterate<S extends IterationScope, I, R>(
    parent: S,
    items: Iterable<I> | AsyncIterable<I>,
    options: IterationOptions,
    operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<R>,
    collect: (index: number, value: R) => void
): Promise<IterationResult> {
    const concurrency = options.concurrency ?? 1;
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
        throw new RangeError("Scoped iteration concurrency must be a positive safe integer.");
    }

    let iterator: InputIterator<I> | undefined;
    let exhausted = false;
    let stopAdmission = false;
    let cancelled = false;
    let started = 0;
    const active = new Map<number, Promise<void>>();
    const inputFailures: unknown[] = [];
    const itemFailures = new Map<number, unknown>();
    const closeFailures: unknown[] = [];

    const observeCancellation = () => {
        if (parent.isCancelled?.() === true) cancelled = true;
        if (cancelled) stopAdmission = true;
        return cancelled;
    };

    const startItem = (item: Awaited<I>) => {
        const index = started++;
        const itemPipeline = scoped<unknown, S>().pipeScoped(async (ctx) => {
            try {
                return await operation(item, ctx, index);
            } catch (error) {
                // Stop admission as soon as the body fails, even if its cleanup is still pending.
                stopAdmission = true;
                throw error;
            }
        });
        const pending = Promise.resolve(itemPipeline(parent))
            .then(
                (value) => {
                    collect(index, value);
                },
                (error: unknown) => {
                    stopAdmission = true;
                    itemFailures.set(index, error);
                }
            )
            .finally(() => {
                active.delete(index);
            });
        active.set(index, pending);
    };

    const consumeInput = async () => {
        if (observeCancellation()) return;
        iterator = getInputIterator(items);
        const next = iterator.next.bind(iterator);

        while (!stopAdmission) {
            if (active.size >= concurrency) await Promise.race(active.values());
            if (observeCancellation() || stopAdmission) break;

            const entry = await next();
            if (typeof entry !== "object" || entry === null) {
                throw new TypeError("An iterator result must be an object.");
            }
            if (entry.done) {
                exhausted = true;
                break;
            }

            const item = await entry.value;
            if (observeCancellation() || stopAdmission) break;
            startItem(item);
        }
    };

    const closeInput = async () => {
        if (!iterator || exhausted) return;
        try {
            const close = iterator.return;
            if (close) await close.call(iterator);
        } catch (error) {
            closeFailures.push(error);
        }
    };

    try {
        await consumeInput();
    } catch (error) {
        inputFailures.push(error);
        stopAdmission = true;
    } finally {
        await closeInput();
        await Promise.all(active.values());
    }

    try {
        observeCancellation();
    } catch (error) {
        inputFailures.push(error);
    }
    throwIterationFailures([
        ...inputFailures,
        ...[...itemFailures].sort(([left], [right]) => left - right).map(([, error]) => error),
        ...closeFailures,
    ]);
    return cancelled ? { status: "cancelled", started } : { status: "completed", started };
}
