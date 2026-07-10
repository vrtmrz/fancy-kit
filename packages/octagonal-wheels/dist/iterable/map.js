async function* withIndex(iterable) {
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
async function* withConcurrency(iterable, callback, concurrency) {
    const processes = new Set();
    const mapTaskToPromise = new Map();
    let serial = 0;
    const enqueue = (item) => {
        const idx = serial++;
        const promise = (async () => [idx, (await callback(item))])();
        processes.add(promise);
        mapTaskToPromise.set(idx, promise);
    };
    const consume = async () => {
        const r = await Promise.race(processes);
        const item = mapTaskToPromise.get(r[0]);
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
async function* filter(iterable, callback) {
    for await (const t of iterable) {
        if (await callback(t)) {
            yield t;
        }
    }
}
async function* map(iterable, callback) {
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
async function* asyncMapWithConcurrency(iterable, callback, concurrency) {
    const buffer = new Map();
    let head = 0;
    const source = withConcurrency(withIndex(iterable), async ([index, value]) => {
        return [index, await callback(value)];
    }, concurrency);
    for await (const t of source) {
        const [index, value] = t;
        buffer.set(index, value);
        while (buffer.has(head)) {
            yield buffer.get(head);
            buffer.delete(head);
            head++;
        }
    }
    while (buffer.has(head)) {
        yield buffer.get(head);
        buffer.delete(head);
        head++;
    }
    if (buffer.size > 0) {
        throw new Error("Buffer not empty");
    }
}

export { asyncMapWithConcurrency, filter, map, withConcurrency };
//# sourceMappingURL=map.js.map
