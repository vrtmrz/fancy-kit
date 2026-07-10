async function* withIndex<T>(iterable: Iterable<T> | AsyncIterable<T>): AsyncIterable<[number, T]> {
    let order = 0;
    for await (const t of iterable) {
        yield [order++, t];
    }
}

/**
 * apply a function to each element of an iterable asynchronously with a concurrency limit.
 * Note that the order of the elements is not guaranteed.
 * @param iterable An iterable items to be processed.
 * @param callback A function to be applied to each element of the iterable.
 * @param concurrency The number of concurrent processes.
 */
export async function* withConcurrency<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    callback: (t: T) => Promise<U> | U,
    concurrency: number
): AsyncIterable<U> {
    const processes = new Set<Promise<[number, U]>>();
    const mapTaskToPromise = new Map<number, Promise<[number, U]>>();
    let serial = 0;
    const enqueue = (item: T) => {
        const idx = serial++;
        const promise = (async () => [idx, (await callback(item)) as U] as [number, U])();
        processes.add(promise);
        mapTaskToPromise.set(idx, promise);
    };
    const consume = async () => {
        const r = await Promise.race(processes);
        const item = mapTaskToPromise.get(r[0])!;
        processes.delete(item);
        mapTaskToPromise.delete(r[0]);
        return r[1];
    };
    for await (const t of iterable) {
        while (processes.size >= concurrency) {
            yield await consume();
        }
        enqueue(t);
    }
    while (processes.size > 0) {
        yield await consume();
    }
}

/**
 * Just like an filter function in the Array, but this function is asynchronous.
 * @param iterable Source iterable.
 * @param callback Filtering function.
 */
export async function* filter<T>(
    iterable: Iterable<T> | AsyncIterable<T>,
    callback: (t: T) => boolean | Promise<boolean>
): AsyncIterable<T> {
    for await (const t of iterable) {
        if (await callback(t)) {
            yield t;
        }
    }
}

export async function* map<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    callback: (t: T) => U | Promise<U>
): AsyncIterable<U> {
    for await (const t of iterable) {
        yield await callback(t);
    }
}

/**
 * apply a function to each element of an iterable asynchronously, as keeping the order of the elements.
 * @param iterable an iterable items to be processed.
 * @param callback a function to be applied to each element of the iterable.
 * @param concurrency  the number of concurrent processes.
 */
export async function* asyncMapWithConcurrency<T, U>(
    iterable: Iterable<T> | AsyncIterable<T>,
    callback: (t: T) => U | Promise<U>,
    concurrency: number
): AsyncIterable<U> {
    const buffer = new Map<number, U>();
    let head = 0;
    const source = withConcurrency(
        withIndex(iterable),
        async ([index, value]) => {
            return [index, await callback(value)] as const;
        },
        concurrency
    );
    for await (const t of source) {
        const [index, value] = t;
        buffer.set(index, value);
        while (buffer.has(head)) {
            yield buffer.get(head) as U;
            buffer.delete(head);
            head++;
        }
    }
    while (buffer.has(head)) {
        yield buffer.get(head) as U;
        buffer.delete(head);
        head++;
    }
    if (buffer.size > 0) {
        throw new Error("Buffer not empty");
    }
}
