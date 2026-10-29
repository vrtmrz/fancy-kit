import { scoped } from '../resource/scope.js';

function getInputIterator(items) {
    const asyncFactory = items[Symbol.asyncIterator];
    return asyncFactory === undefined || asyncFactory === null
        ? items[Symbol.iterator]()
        : asyncFactory.call(items);
}
function throwIterationFailures(failures) {
    if (failures.length === 1)
        throw failures[0];
    if (failures.length > 1)
        throw new AggregateError(failures, "Multiple failures occurred during scoped iteration.");
}
async function iterate(parent, items, options, operation, collect) {
    const concurrency = options.concurrency ?? 1;
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
        throw new RangeError("Scoped iteration concurrency must be a positive safe integer.");
    }
    let iterator;
    let exhausted = false;
    let stopAdmission = false;
    let cancelled = false;
    let started = 0;
    const active = new Map();
    const inputFailures = [];
    const itemFailures = new Map();
    const closeFailures = [];
    const observeCancellation = () => {
        if (parent.isCancelled?.() === true)
            cancelled = true;
        if (cancelled)
            stopAdmission = true;
        return cancelled;
    };
    const startItem = (item) => {
        const index = started++;
        const itemProgram = scoped().pipeScoped(async (ctx) => {
            try {
                return await operation(item, ctx, index);
            }
            catch (error) {
                // Stop admission as soon as the body fails, even if its cleanup is still pending.
                stopAdmission = true;
                throw error;
            }
        });
        const pending = Promise.resolve(itemProgram(parent))
            .then((value) => {
            collect(index, value);
        }, (error) => {
            stopAdmission = true;
            itemFailures.set(index, error);
        })
            .finally(() => {
            active.delete(index);
        });
        active.set(index, pending);
    };
    const consumeInput = async () => {
        if (observeCancellation())
            return;
        iterator = getInputIterator(items);
        const next = iterator.next.bind(iterator);
        while (!stopAdmission) {
            if (active.size >= concurrency)
                await Promise.race(active.values());
            if (observeCancellation() || stopAdmission)
                break;
            const entry = await next();
            if (typeof entry !== "object" || entry === null) {
                throw new TypeError("An iterator result must be an object.");
            }
            if (entry.done) {
                exhausted = true;
                break;
            }
            const item = await entry.value;
            if (observeCancellation() || stopAdmission)
                break;
            startItem(item);
        }
    };
    const closeInput = async () => {
        if (!iterator || exhausted)
            return;
        try {
            const close = iterator.return;
            if (close)
                await close.call(iterator);
        }
        catch (error) {
            closeFailures.push(error);
        }
    };
    try {
        await consumeInput();
    }
    catch (error) {
        inputFailures.push(error);
        stopAdmission = true;
    }
    finally {
        await closeInput();
        await Promise.all(active.values());
    }
    try {
        observeCancellation();
    }
    catch (error) {
        inputFailures.push(error);
    }
    throwIterationFailures([
        ...inputFailures,
        ...[...itemFailures].sort(([left], [right]) => left - right).map(([, error]) => error),
        ...closeFailures,
    ]);
    return cancelled ? { status: "cancelled", started } : { status: "completed", started };
}
/**
 * Runs items in separate child scopes with bounded concurrency.
 *
 * @param parent - The shared value and capabilities borrowed by each item scope.
 * @param items - Input pulled sequentially. Each yielded value is awaited before dispatch.
 * @param options - A positive concurrency bound, including item cleanup; defaults to one.
 * @param operation - Receives an item, its own cleanup context, and the zero-based input index.
 * @returns Completion or cancellation status and the number of callbacks invoked.
 * @remarks
 * The caller must await or return this promise before the parent scope ends. Each
 * child finishes cleanup before releasing its concurrency slot. Cancellation stops
 * new admission without discarding already started work or its errors. An uncaught
 * failure also stops admission; siblings finish without being forcibly cancelled.
 * A pending iterator pull or yielded promise is awaited before early iterator closure.
 * All started item scopes and iterator cleanup settle before this promise settles.
 * Single failures preserve identity. Multiple failures use AggregateError, ordered
 * by input failure, item index, and iterator-close failure. Callback return values
 * are discarded and do not determine application-level success or cancellation.
 */
function forEachInScope(parent, items, options, operation) {
    return iterate(parent, items, options, operation, () => { });
}
/**
 * Maps items in separate child scopes and returns results in input order.
 *
 * @param parent - The shared value and capabilities borrowed by each item scope.
 * @param items - Sequentially pulled synchronous or asynchronous input; yielded values are awaited.
 * @param options - A positive concurrency bound, including item cleanup; defaults to one.
 * @param operation - Produces one value using the item's context and zero-based input index.
 * @returns An explicit completion or cancellation result. Cancelled values cover
 * the started input prefix; unstarted items have no placeholders. Undefined remains data.
 * @remarks
 * Admission, child cleanup, iterator closure, and error handling follow forEachInScope.
 * Started callbacks are awaited even after cancellation. If any fails, the operation
 * rejects after drainage instead of returning a partial success. Returned objects are
 * not cloned, and returning a resource does not transfer its deferred ownership.
 */
async function mapInScope(parent, items, options, operation) {
    const values = [];
    const result = await iterate(parent, items, options, operation, (index, value) => {
        values[index] = value;
    });
    return result.status === "cancelled" ? { status: "cancelled", values } : { status: "completed", values };
}

export { forEachInScope, mapInScope };
//# sourceMappingURL=scopedIteration.js.map
