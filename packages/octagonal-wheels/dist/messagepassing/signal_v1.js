import { RESULT_TIMED_OUT } from '../common/const.js';

const traps = {};
/**
 * Waits for a signal with the specified ID.
 * @param id - The ID of the signal to wait for.
 * @param timeout - The maximum time to wait for the signal, in milliseconds.
 * @returns A promise that resolves to `true` if the signal is received within the timeout, or `false` otherwise.
 */
async function waitForSignal(id, timeout) {
    return (await waitForValue(id, timeout)) !== RESULT_TIMED_OUT;
}
/**
 * Waits for a value with the specified ID to be resolved.
 *
 * @param id - The ID of the value to wait for.
 * @param timeout - Optional timeout value in milliseconds. If the value is not resolved within the specified timeout, the promise will be rejected with a timeout error.
 * @returns A promise that resolves with the value or rejects with a timeout error.
 */
function waitForValue(id, timeout) {
    let resolveTrap;
    let trapJob;
    const timer = timeout
        ? setTimeout(() => {
            if (id in traps) {
                traps[id] = traps[id].filter((e) => e != trapJob);
            }
            if (resolveTrap)
                resolveTrap(RESULT_TIMED_OUT);
            resolveTrap = undefined;
        }, timeout)
        : false;
    return new Promise((res) => {
        if (!(id in traps))
            traps[id] = [];
        resolveTrap = res;
        trapJob = (result) => {
            if (timer)
                clearTimeout(timer);
            res(result);
        };
        traps[id].push(trapJob);
    });
}
/**
 * Sends a signal with the specified ID.
 * @param id - The ID of the signal.
 */
function sendSignal(id) {
    sendValue(id, true);
}
/**
 * Sends a value to the specified ID.
 * @param id - The ID to send the value to.
 * @param result - The value to send.
 */
function sendValue(id, result) {
    if (!(id in traps)) {
        return;
    }
    const trap = traps[id];
    delete traps[id];
    for (const resolver of trap) {
        resolver(result);
    }
}

export { sendSignal, sendValue, waitForSignal, waitForValue };
//# sourceMappingURL=signal_v1.js.map
