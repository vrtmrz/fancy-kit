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
export declare function asChunk<T>(source: Iterable<T> | AsyncIterable<T>, { unit, timeout, interval }: ChunkProcessOptions): AsyncIterable<T[]>;
/**
 * Flattens nested async or sync iterables.
 * The counterpart to `asChunk`.
 * @param source
 */
export declare function asFlat<T>(source: AsyncIterable<AsyncIterable<T> | Iterable<T>>): AsyncIterable<T>;
export {};
