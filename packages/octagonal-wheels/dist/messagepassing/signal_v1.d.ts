import { type RESULT_NOT_FOUND, RESULT_TIMED_OUT } from "../common/const.ts";
export type WithTimeout<T> = T | typeof RESULT_TIMED_OUT;
export type WithNotFound<T> = T | typeof RESULT_NOT_FOUND;
/**
 * Waits for a signal with the specified ID.
 * @param id - The ID of the signal to wait for.
 * @param timeout - The maximum time to wait for the signal, in milliseconds.
 * @returns A promise that resolves to `true` if the signal is received within the timeout, or `false` otherwise.
 */
export declare function waitForSignal(id: string, timeout?: number): Promise<boolean>;
/**
 * Waits for a value with the specified ID to be resolved.
 *
 * @param id - The ID of the value to wait for.
 * @param timeout - Optional timeout value in milliseconds. If the value is not resolved within the specified timeout, the promise will be rejected with a timeout error.
 * @returns A promise that resolves with the value or rejects with a timeout error.
 */
export declare function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>>;
/**
 * Sends a signal with the specified ID.
 * @param id - The ID of the signal.
 */
export declare function sendSignal(id: string): void;
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
export declare function sendValue<T>(id: string, result: T): void;
