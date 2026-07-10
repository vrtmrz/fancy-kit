import { type RESULT_NOT_FOUND, RESULT_TIMED_OUT } from "../common/const.ts";

export type WithTimeout<T> = T | typeof RESULT_TIMED_OUT;
export type WithNotFound<T> = T | typeof RESULT_NOT_FOUND;

const traps = {} as { [key: string]: ((param: any) => void)[] };
/**
 * Waits for a signal with the specified ID.
 * @param id - The ID of the signal to wait for.
 * @param timeout - The maximum time to wait for the signal, in milliseconds.
 * @returns A promise that resolves to `true` if the signal is received within the timeout, or `false` otherwise.
 */
export async function waitForSignal(id: string, timeout?: number): Promise<boolean> {
    return (await waitForValue(id, timeout)) !== RESULT_TIMED_OUT;
}
/**
 * Waits for a value with the specified ID to be resolved.
 *
 * @param id - The ID of the value to wait for.
 * @param timeout - Optional timeout value in milliseconds. If the value is not resolved within the specified timeout, the promise will be rejected with a timeout error.
 * @returns A promise that resolves with the value or rejects with a timeout error.
 */
export function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>> {
    let resolveTrap: ((result: WithTimeout<T>) => void) | undefined;
    let trapJob: (() => void) | ((param: T) => void);
    const timer = timeout
        ? setTimeout(() => {
              if (id in traps) {
                  traps[id] = traps[id].filter((e) => e != trapJob);
              }
              if (resolveTrap) resolveTrap(RESULT_TIMED_OUT);
              resolveTrap = undefined;
          }, timeout)
        : false;
    return new Promise((res) => {
        if (!(id in traps)) traps[id] = [];
        resolveTrap = res;
        trapJob = (result: T) => {
            if (timer) clearTimeout(timer);
            res(result);
        };
        traps[id].push(trapJob);
    });
}

/**
 * Sends a signal with the specified ID.
 * @param id - The ID of the signal.
 */
export function sendSignal(id: string) {
    sendValue(id, true);
}
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
export function sendValue<T>(id: string, result: T) {
    if (!(id in traps)) {
        return;
    }
    const trap = traps[id];
    delete traps[id];
    for (const resolver of trap) {
        resolver(result);
    }
}
