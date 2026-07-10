import { PaceMaker } from "../bureau/PaceMaker.ts";
import { NOT_AVAILABLE, InboxWithEvent } from "../bureau/Inbox.ts";
import { Feeder, Porter } from "../bureau/Clerk.ts";
import { promiseWithResolvers } from "../promises.ts";

type ChunkProcessOptions = {
    /**
     * The number of items to be packed into a single chunk.
     */
    unit: number;

    /**
     * The maximum time to wait for the next chunk to be filled.
     * If the timeout is reached, the current chunk will be yielded partially.
     * This counted from the last item has been enqueued.
     * Empty chunks will not be yielded.
     */
    timeout?: number;
    /**
     * The minimum time to wait before yielding the next chunk.
     * If chunks are filled before the interval passes, yielding will be delayed.
     * This counted from the last chunk has been yielded.
     */
    interval?: number;
};

/**
 * async generator that yields chunks of items from the source.
 * @param source
 * @param {ChunkProcessOptions} options
 */
export async function* asChunk<T>(
    source: Iterable<T> | AsyncIterable<T>,
    { unit, timeout, interval }: ChunkProcessOptions
): AsyncIterable<T[]> {
    const postBox = new InboxWithEvent<T>(unit * 10);
    const outgoingBox = new InboxWithEvent<T[]>(10);
    const completed = promiseWithResolvers<void>();
    const pacemaker = interval ? new PaceMaker(interval) : undefined;
    let isCompleted = false;

    const porter = new Porter({
        from: postBox,
        to: outgoingBox,
        timeout: timeout,
        maxSize: unit,
    });
    const feeder = new Feeder({
        source,
        target: postBox,
    });
    const checkStates = () => {
        if (porter.stateDetail.isBusy) return;
        // if (harvester.stateDetail.isBusy) return;
        if (!feeder.stateDetail.hasFinished) return;
        if (outgoingBox.size != 0) return;
        isCompleted = true;
        completed.resolve();
    };
    feeder.setOnProgress((state) => {
        checkStates();
    });
    porter.setOnProgress((state) => {
        checkStates();
    });
    postBox.setOnProgress((state) => {
        checkStates();
    });
    outgoingBox.setOnProgress((state) => {
        checkStates();
    });

    do {
        const chunk = await outgoingBox.pick(undefined, [completed.promise]);
        if (chunk === NOT_AVAILABLE) {
            if (isCompleted) {
                break;
            }
            continue;
        }

        if (pacemaker) {
            await Promise.race([pacemaker.paced]);
        }

        yield chunk;
        pacemaker?.mark();
    } while (!isCompleted);
    porter.dispose();
}

/**
 * Flattens nested async or sync iterables.
 * The counterpart to `asChunk`.
 * @param source
 */
export async function* asFlat<T>(source: AsyncIterable<AsyncIterable<T> | Iterable<T>>): AsyncIterable<T> {
    for await (const chunk of source) {
        for await (const item of chunk) {
            yield item;
        }
    }
}
