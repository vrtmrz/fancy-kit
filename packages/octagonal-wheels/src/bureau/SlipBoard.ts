import {
    cancelableDelay,
    fireAndForget,
    promiseWithResolvers,
    TIMED_OUT_SIGNAL,
    yieldMicrotask,
    type PromiseWithResolvers,
} from "../promises.ts";
import { RESULT_TIMED_OUT } from "../common/const.ts";

export type WithTimeout<T> = T | typeof RESULT_TIMED_OUT;
const GENERIC_COMPATIBILITY_VALUE = "x-compatibility-value";
const GENERIC_COMPATIBILITY_SIGNAL = "x-compatibility-signal";

declare global {
    /**
     * The ype of slips that can be used in the SlipBoard
     */
    interface LSSlips {
        "wait-for-timeout": boolean;
        // "dummy": undefined;
        [GENERIC_COMPATIBILITY_VALUE]: any;
        [GENERIC_COMPATIBILITY_SIGNAL]: undefined;
    }
}

type SlipWithData<ET, K> = K extends keyof ET
    ? ET[K] extends undefined
        ? never
        : K extends string
          ? K
          : never
    : never;
type SlipWithoutData<ET, K> = K extends keyof ET
    ? ET[K] extends undefined
        ? K extends string
            ? K
            : never
        : never
    : never;
type SlipType<ET, K> = SlipWithoutData<ET, K> | SlipWithData<ET, K> | K extends string ? K : never;

type SlipDataType<ET extends Record<string, any>, K extends keyof ET> = ET[K] extends undefined ? undefined : ET[K];
type ResultType<ET extends Record<string, any>, K extends keyof ET> = ET[K] extends undefined ? void : ET[K];

export type SlipProcessOptions<T> = {
    callback: () => Promise<T> | T;
} & (
    | { submitAsSuccess?: false; dropSlipWithRisks?: boolean }
    | { submitAsSuccess: true; transformError?: (error: any) => any }
);
/**
 * A Class for wait
 */

export type AwaitOptionBase = {
    onNotAwaited?: () => void;
};
export type AwaitOptionWithoutTimeout = AwaitOptionBase & { timeout?: undefined | false };
export type AwaitOptionWithTimeout = AwaitOptionBase & { timeout?: number };
type AwaitOption = AwaitOptionWithoutTimeout | AwaitOptionWithTimeout;

export class SlipBoard<Events extends LSSlips = LSSlips> {
    _clip = new Map<string | symbol | number, PromiseWithResolvers<any>>();

    /**
     * Checks if a specific key is awaiting.
     *
     * @template ET - The type of the events.
     * @template K - The key of the event in the events type.
     * @param {SlipType<ET, K>} type - The key representing the event type.
     * @param {string} key - The key representing the specific sub-event.
     * @returns {boolean} - Returns `true` if the event and sub-event combination is awaiting, otherwise `false`.
     */
    isAwaiting<ET extends Events, K extends keyof ET>(type: SlipType<ET, K>, key: string): boolean {
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
    issueAndProceed<T>(type: string, key: string = "", opt: SlipProcessOptions<T>): Promise<T> {
        // This key is not necessary to be member of events, because that is expected to be used only via this method.
        if (!this.isAwaiting(type as any, key)) {
            fireAndForget(async () => {
                try {
                    const ret = await opt.callback();
                    this.submit(type as any, key, ret);
                } catch (ex) {
                    if (opt.submitAsSuccess) {
                        this.submit(type as any, key, opt.transformError ? opt.transformError(ex) : ex);
                    } else {
                        if (opt.dropSlipWithRisks) {
                            this._clip.delete(type);
                            // If the caller waits for the result and it would waiting without timeout, it will be waiting forever.
                        } else {
                            this.reject(type as any, key, ex);
                        }
                    }
                }
            });
        }
        return this.awaitNext(type as any, key) as Promise<T>;
    }

    awaitNext<ET extends Events, K extends keyof ET>(
        type: K,
        key: string,
        opt?: AwaitOptionWithoutTimeout
    ): Promise<ResultType<ET, K>>;
    awaitNext<ET extends Events, K extends keyof ET>(
        type: K,
        key: string,
        opt?: AwaitOptionWithTimeout
    ): Promise<ResultType<ET, K> | TIMED_OUT_SIGNAL>;
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
    async awaitNext<ET extends Events, K extends keyof ET>(
        type: K,
        key: string = "",
        { timeout, onNotAwaited }: AwaitOption = { timeout: undefined, onNotAwaited: undefined }
    ): Promise<ResultType<ET, K> | TIMED_OUT_SIGNAL> {
        let taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (!taskPromise) {
            taskPromise = promiseWithResolvers<void | ET[K]>();
            taskPromise.promise = taskPromise.promise
                .then((ret: unknown) => {
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
                taskPromise.promise.then((ret: any) => ret).finally(() => cDelay.cancel()),
            ]);
        }
        return await taskPromise.promise;
    }

    submit<ET extends Events, K extends keyof ET>(type: SlipWithoutData<ET, K>, key: string): void;
    submit<ET extends Events, K extends keyof ET>(type: SlipWithData<ET, K>, key: string, data: ET[K]): void;
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
    submit<ET extends Events, K extends keyof ET>(
        type: SlipType<ET, K>,
        key: string,
        data?: SlipDataType<ET, K>
    ): void {
        const taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (taskPromise) {
            taskPromise.resolve(data);
        }
    }

    submitToAll<ET extends Events, K extends keyof ET>(type: SlipWithoutData<ET, K>, prefix: string): void;
    submitToAll<ET extends Events, K extends keyof ET>(type: SlipWithData<ET, K>, prefix: string, data: ET[K]): void;
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
    submitToAll<ET extends Events, K extends keyof ET>(
        type: SlipType<ET, K>,
        prefix: string,
        data?: SlipDataType<ET, K>
    ): void {
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
    reject<ET extends Events, K extends keyof ET>(type: SlipType<ET, K>, key: string = "", reason: any) {
        const taskPromise = this._clip.get(`${String(type)}:${key}`);
        if (taskPromise) {
            taskPromise.reject(reason);
        }
    }
}

export const globalSlipBoard = new SlipBoard();

export async function waitForSignal(id: string, timeout?: number): Promise<boolean> {
    return (await globalSlipBoard.awaitNext(GENERIC_COMPATIBILITY_SIGNAL, id, { timeout })) !== TIMED_OUT_SIGNAL;
}

export async function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>> {
    const ret = await globalSlipBoard.awaitNext(GENERIC_COMPATIBILITY_VALUE, id, { timeout });
    if (ret === TIMED_OUT_SIGNAL) {
        return RESULT_TIMED_OUT;
    }
    return ret as T;
}

export function sendSignal(id: string) {
    globalSlipBoard.submit(GENERIC_COMPATIBILITY_SIGNAL, id);
}
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
export function sendValue<T>(id: string, result: T) {
    globalSlipBoard.submit(GENERIC_COMPATIBILITY_VALUE, id, result as any);
}
