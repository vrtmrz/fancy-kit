import { fireAndForget, promiseWithResolvers, yieldMicrotask, cancelableDelay, TIMED_OUT_SIGNAL } from '../promises.js';
import { RESULT_TIMED_OUT } from '../common/const.js';

const GENERIC_COMPATIBILITY_VALUE = "x-compatibility-value";
const GENERIC_COMPATIBILITY_SIGNAL = "x-compatibility-signal";
class SlipBoard {
    constructor() {
        Object.defineProperty(this, "_clip", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    /**
     * Checks if a specific key is awaiting.
     *
     * @template ET - The type of the events.
     * @template K - The key of the event in the events type.
     * @param {SlipType<ET, K>} type - The key representing the event type.
     * @param {string} key - The key representing the specific sub-event.
     * @returns {boolean} - Returns `true` if the event and sub-event combination is awaiting, otherwise `false`.
     */
    isAwaiting(type, key) {
        return this._clip.has(`${String(type)}:${key}`);
    }
    /**
     * Issues a slip of process and proceeds with the provided options.
     *
     * @template T - The type of the result expected from the process.
     * @param {string} type - The type of the process to be issued.
     * @param {string} [key=""] - An optional key to identify the process.
     * @param {SlipProcessOptions<T>} opt - The options for the process, including the callback to be executed.
     * @returns {Promise<T>} - A promise that resolves with the result of the process.
     *
     * @remarks
     * - If the process is not already awaiting, it will be issued and the callback will be executed.
     * - If the callback succeeds, the result will be submitted.
     * - If the callback fails, the error handling depends on the options provided:
     *   - If `submitAsSuccess` is true, the error (or transformed error) will be submitted as a success.
     *   - If `dropSlipWithRisks` is true, the process will be deleted from the clip.
     *   - Otherwise, the error will be rejected.
     * - The method returns a promise that resolves with the next result of the process.
     */
    issueAndProceed(type, key = "", opt) {
        // This key is not necessary to be member of events, because that is expected to be used only via this method.
        if (!this.isAwaiting(type, key)) {
            fireAndForget(async () => {
                try {
                    const ret = await opt.callback();
                    this.submit(type, key, ret);
                }
                catch (ex) {
                    if (opt.submitAsSuccess) {
                        this.submit(type, key, opt.transformError ? opt.transformError(ex) : ex);
                    }
                    else {
                        if (opt.dropSlipWithRisks) {
                            this._clip.delete(type);
                            // If the caller waits for the result and it would waiting without timeout, it will be waiting forever.
                        }
                        else {
                            this.reject(type, key, ex);
                        }
                    }
                }
            });
        }
        return this.awaitNext(type, key);
    }
    /**
     * Waits for the next event of the specified type and key, with an optional timeout.
     *
     * @template ET - The type of the events.
     * @template K - The key of the event type.
     * @param {SlipType<ET, K>} type - The type of the event to wait for.
     * @param {string} [key=""] - The key associated with the event.
     * @param {number} [timeout] - The optional timeout in milliseconds.
     * @returns {Promise<void | ET[K] | TIMED_OUT_SIGNAL>} A promise that resolves with the event data,
     * resolves with `TIMED_OUT_SIGNAL` if the timeout is reached, or resolves to void if no event is found.
     */
    async awaitNext(type, key = "", { timeout, onNotAwaited } = { timeout: undefined, onNotAwaited: undefined }) {
        let taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (!taskPromise) {
            taskPromise = promiseWithResolvers();
            taskPromise.promise = taskPromise.promise
                .then((ret) => {
                // this.clip.delete(key);
                return ret;
            })
                .finally(() => {
                this._clip.delete(`${String(type)}:${key}`);
            });
            this._clip.set(`${String(type)}:${key}`, taskPromise);
            if (onNotAwaited) {
                fireAndForget(async () => (await yieldMicrotask(), onNotAwaited()));
            }
        }
        if (timeout) {
            const cDelay = cancelableDelay(timeout);
            return Promise.race([
                cDelay.promise,
                taskPromise.promise.then((ret) => ret).finally(() => cDelay.cancel()),
            ]);
        }
        return await taskPromise.promise;
    }
    /**
     * Submits an event of a specified type with optional data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event type in ET.
     * @param {SlipType<ET, K>} type - The type of the event to submit.
     * @param {string} [key=""] - An optional key associated with the event.
     * @param {SlipDataType<ET, K>} [data] - Optional data to be passed with the event.
     * @returns {void}
     */
    submit(type, key, data) {
        const taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (taskPromise) {
            taskPromise.resolve(data);
        }
    }
    /**
     * Submits an event of a specified type to all listeners.
     *
     * @template ET - The type of events.
     * @template K - The key of the event type in ET.
     * @param {SlipType<ET, K>} type - The type of the event to submit.
     * @param {string} prefix - The prefix to match the keys of the listeners.
     * @param {SlipDataType<ET, K>} [data] - Optional data to be passed with the event.
     * @returns {void}
     */
    submitToAll(type, prefix, data) {
        for (const [key, taskPromise] of this._clip.entries()) {
            if (`${String(key)}`.startsWith(`${String(type)}:${prefix}`)) {
                taskPromise.resolve(data);
            }
        }
    }
    /**
     * Rejects a task promise associated with a specific event type and key.
     *
     * @template ET - The type of events.
     * @template K - The keys of the events.
     * @param {SlipType<ET, K>} type - The type of the event.
     * @param {string} [key=""] - The key associated with the event. Defaults to an empty string.
     * @param {any} reason - The reason for rejecting the promise.
     */
    reject(type, key = "", reason) {
        const taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (taskPromise) {
            taskPromise.reject(reason);
        }
    }
}
const globalSlipBoard = new SlipBoard();
async function waitForSignal(id, timeout) {
    return (await globalSlipBoard.awaitNext(GENERIC_COMPATIBILITY_SIGNAL, id, { timeout })) !== TIMED_OUT_SIGNAL;
}
async function waitForValue(id, timeout) {
    const ret = await globalSlipBoard.awaitNext(GENERIC_COMPATIBILITY_VALUE, id, { timeout });
    if (ret === TIMED_OUT_SIGNAL) {
        return RESULT_TIMED_OUT;
    }
    return ret;
}
function sendSignal(id) {
    globalSlipBoard.submit(GENERIC_COMPATIBILITY_SIGNAL, id);
}
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
function sendValue(id, result) {
    globalSlipBoard.submit(GENERIC_COMPATIBILITY_VALUE, id, result);
}

export { SlipBoard, globalSlipBoard, sendSignal, sendValue, waitForSignal, waitForValue };
//# sourceMappingURL=SlipBoard.js.map
