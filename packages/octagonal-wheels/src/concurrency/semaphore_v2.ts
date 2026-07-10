import {
    cancelableDelay,
    TIMED_OUT_SIGNAL,
    fireAndForget,
    promiseWithResolvers,
    yieldMicrotask,
    type PromiseWithResolvers,
} from "../promises.ts";
export type SemaphoreReleaser = () => void;
export type SemaphoreObject = {
    acquire(quantity?: number): Promise<SemaphoreReleaser>;
    tryAcquire(quantity?: number, timeout?: number): Promise<SemaphoreReleaser | false>;
    // setLimit(limit: number): void;
    waiting: number;
};
export function Semaphore(limit: number): SemaphoreObject {
    let counter = 0;
    const _limit = limit;

    const queue: PromiseWithResolvers<void>[] = [];
    const semaphore = {
        get waiting() {
            return queue.length;
        },
        async tryAcquire(quantity: number = 1, timeout: number) {
            if (counter < _limit) {
                counter += quantity;
                return () => {
                    this.release(quantity);
                };
            }
            const d = cancelableDelay(timeout, TIMED_OUT_SIGNAL);
            const aq = this.acquire(quantity);
            const p = await Promise.race([d.promise, aq]);
            if (p === TIMED_OUT_SIGNAL) {
                // Cancel after acquired
                fireAndForget(() => aq.then((release) => release()));
                return false;
            }
            return p;
        },
        async acquire(quantity: number = 1): Promise<() => void> {
            if (counter < _limit) {
                counter += quantity;
                return () => this.release();
            }
            const n = promiseWithResolvers<void>();
            queue.push(n);
            await n.promise;
            return () => {
                this.release(quantity);
            };
        },
        release(quantity: number = 1) {
            if (queue.length > 0) {
                const next = queue.shift();
                if (next) {
                    fireAndForget(async () => await yieldMicrotask().then(() => next.resolve()));
                }
            } else {
                if (counter > 0) {
                    counter -= quantity;
                }
            }
        },
    };
    return semaphore as SemaphoreObject;
}
