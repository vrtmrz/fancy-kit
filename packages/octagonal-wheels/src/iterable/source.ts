import { promiseWithResolvers } from "../promises.ts";

const GENERATOR_CLOSED = Symbol("closed");
export function generativeBuffer<T>() {
    let current = promiseWithResolvers<T | typeof GENERATOR_CLOSED>();
    let next = [current];
    let closed = false;
    let finished = false;
    let onSizeUpdated: ((size: number) => void) | undefined;
    const updateSize = () => {
        if (onSizeUpdated) {
            try {
                onSizeUpdated(next.length - 1);
            } catch {
                /* NO OP*/
            }
        }
    };
    return {
        enqueue(item: T) {
            if (closed || finished) {
                throw new Error("Cannot enqueue to a closed or finished source");
            }
            const promise = current;
            const newNext = promiseWithResolvers<T | typeof GENERATOR_CLOSED>();
            current = newNext;
            next.push(current);
            updateSize();
            promise.resolve(item);
        },
        [Symbol.asyncIterator](): AsyncGenerator<Awaited<T>, void, unknown> {
            return this.values();
        },
        dispose() {
            if (closed) return;
            closed = true;
            current.resolve(GENERATOR_CLOSED);
        },
        finish() {
            finished = true;
            current.resolve(GENERATOR_CLOSED);
        },
        [Symbol.dispose]() {
            this.dispose();
        },
        async *values(): AsyncGenerator<Awaited<T>, void, unknown> {
            while (!closed) {
                try {
                    const ret = await next[0].promise;
                    next = next.slice(1); //// Drop the resolved promise
                    if (ret === GENERATOR_CLOSED) return;
                    yield ret;
                } catch (e) {
                    if (closed || e === GENERATOR_CLOSED) {
                        return;
                    }
                    throw e;
                } finally {
                    updateSize();
                }
            }
            try {
                next.forEach((p) => p.reject(GENERATOR_CLOSED));
                next.length = 0;
            } catch (e) {
                console.log(`Error on cleanup: ${String(e)}`);
            }
        },
        get size() {
            return next.length - 1;
        },
    };
}

export class GeneratorSource<T> {
    _next: ReturnType<typeof promiseWithResolvers<T | typeof GENERATOR_CLOSED>>[];
    _current: ReturnType<typeof promiseWithResolvers<T | typeof GENERATOR_CLOSED>>;
    _onSizeUpdated?: (size: number) => void;
    _updateSize() {
        if (this._onSizeUpdated) {
            try {
                this._onSizeUpdated(this.size);
            } catch {
                /* NO OP*/
            }
        }
    }
    get size() {
        return this._next.length - 1;
    }
    closed: boolean;
    finished: boolean;
    constructor(onSizeUpdated?: (size: number) => void) {
        this.closed = false;
        this.finished = false;
        this._current = promiseWithResolvers<T | typeof GENERATOR_CLOSED>();
        this._next = [this._current];
        this._onSizeUpdated = onSizeUpdated;
    }
    enqueue(item: T) {
        if (this.closed || this.finished) {
            throw new Error("Cannot enqueue to a closed or finished source");
        }
        const promise = this._current;
        const next = promiseWithResolvers<T | typeof GENERATOR_CLOSED>();
        this._current = next;
        this._next.push(this._current);
        this._updateSize();
        promise.resolve(item);
    }
    dispose() {
        if (this.closed) return;
        this.closed = true;
        this._current.resolve(GENERATOR_CLOSED);
    }
    finish() {
        this.finished = true;
        this._current.resolve(GENERATOR_CLOSED);
    }
    [Symbol.asyncIterator]() {
        return this.values();
    }
    [Symbol.dispose]() {
        console.log("@disposed");
        this.dispose();
    }
    async *values() {
        while (!this.closed) {
            try {
                const ret = await this._next[0].promise;
                this._next = this._next.slice(1); //// Drop the resolved promise
                if (ret === GENERATOR_CLOSED) break;
                yield ret;
            } catch (e) {
                if (this.closed || e === GENERATOR_CLOSED) {
                    break;
                }
                throw e;
            } finally {
                this._updateSize();
            }
        }
        try {
            this._next.forEach((p) => {
                p.reject();
            });
            this._next.length = 0;
        } catch (e) {
            console.log(`Error on cleanup: ${String(e)}`);
        }
    }
}
