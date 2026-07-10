import { TIMED_OUT_SIGNAL, type PromiseWithResolvers } from "../promises.ts";
import { RESULT_TIMED_OUT } from "../common/const.ts";
export type WithTimeout<T> = T | typeof RESULT_TIMED_OUT;
declare const GENERIC_COMPATIBILITY_VALUE = "x-compatibility-value";
declare const GENERIC_COMPATIBILITY_SIGNAL = "x-compatibility-signal";
declare global {
    /**
     * The ype of slips that can be used in the SlipBoard
     */
    interface LSSlips {
        "wait-for-timeout": boolean;
        [GENERIC_COMPATIBILITY_VALUE]: any;
        [GENERIC_COMPATIBILITY_SIGNAL]: undefined;
    }
}
type SlipWithData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? never : K extends string ? K : never : never;
type SlipWithoutData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? K extends string ? K : never : never : never;
type SlipType<ET, K> = SlipWithoutData<ET, K> | SlipWithData<ET, K> | K extends string ? K : never;
type ResultType<ET extends Record<string, any>, K extends keyof ET> = ET[K] extends undefined ? void : ET[K];
export type SlipProcessOptions<T> = {
    callback: () => Promise<T> | T;
} & ({
    submitAsSuccess?: false;
    dropSlipWithRisks?: boolean;
} | {
    submitAsSuccess: true;
    transformError?: (error: any) => any;
});
/**
 * A Class for wait
 */
export type AwaitOptionBase = {
    onNotAwaited?: () => void;
};
export type AwaitOptionWithoutTimeout = AwaitOptionBase & {
    timeout?: undefined | false;
};
export type AwaitOptionWithTimeout = AwaitOptionBase & {
    timeout?: number;
};
export declare class SlipBoard<Events extends LSSlips = LSSlips> {
    _clip: Map<string | number | symbol, PromiseWithResolvers<any>>;
    /**
     * Checks if a specific key is awaiting.
     *
     * @template ET - The type of the events.
     * @template K - The key of the event in the events type.
     * @param {SlipType<ET, K>} type - The key representing the event type.
     * @param {string} key - The key representing the specific sub-event.
     * @returns {boolean} - Returns `true` if the event and sub-event combination is awaiting, otherwise `false`.
     */
    isAwaiting<ET extends Events, K extends keyof ET>(type: SlipType<ET, K>, key: string): boolean;
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
    issueAndProceed<T>(type: string, key: string | undefined, opt: SlipProcessOptions<T>): Promise<T>;
    awaitNext<ET extends Events, K extends keyof ET>(type: K, key: string, opt?: AwaitOptionWithoutTimeout): Promise<ResultType<ET, K>>;
    awaitNext<ET extends Events, K extends keyof ET>(type: K, key: string, opt?: AwaitOptionWithTimeout): Promise<ResultType<ET, K> | TIMED_OUT_SIGNAL>;
    submit<ET extends Events, K extends keyof ET>(type: SlipWithoutData<ET, K>, key: string): void;
    submit<ET extends Events, K extends keyof ET>(type: SlipWithData<ET, K>, key: string, data: ET[K]): void;
    submitToAll<ET extends Events, K extends keyof ET>(type: SlipWithoutData<ET, K>, prefix: string): void;
    submitToAll<ET extends Events, K extends keyof ET>(type: SlipWithData<ET, K>, prefix: string, data: ET[K]): void;
    /**
     * Rejects a task promise associated with a specific event type and key.
     *
     * @template ET - The type of events.
     * @template K - The keys of the events.
     * @param {SlipType<ET, K>} type - The type of the event.
     * @param {string} [key=""] - The key associated with the event. Defaults to an empty string.
     * @param {any} reason - The reason for rejecting the promise.
     */
    reject<ET extends Events, K extends keyof ET>(type: SlipType<ET, K>, key: string | undefined, reason: any): void;
}
export declare const globalSlipBoard: SlipBoard<LSSlips>;
export declare function waitForSignal(id: string, timeout?: number): Promise<boolean>;
export declare function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>>;
export declare function sendSignal(id: string): void;
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
export declare function sendValue<T>(id: string, result: T): void;
export {};
