import { fireAndForget, yieldMicrotask, promiseWithResolvers, cancelableDelay, TIMED_OUT_SIGNAL } from '../promises.js';

function Semaphore(limit) {
    let counter = 0;
    const _limit = limit;
    const queue = [];
    const semaphore = {
        get waiting() {
            return queue.length;
        },
        async tryAcquire(quantity = 1, timeout) {
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
        async acquire(quantity = 1) {
            if (counter < _limit) {
                counter += quantity;
                return () => this.release();
            }
            const n = promiseWithResolvers();
            queue.push(n);
            await n.promise;
            return () => {
                this.release(quantity);
            };
        },
        release(quantity = 1) {
            if (queue.length > 0) {
                const next = queue.shift();
                if (next) {
                    fireAndForget(async () => await yieldMicrotask().then(() => next.resolve()));
                }
            }
            else {
                if (counter > 0) {
                    counter -= quantity;
                }
            }
        },
    };
    return semaphore;
}

export { Semaphore };
//# sourceMappingURL=semaphore_v2.js.map
