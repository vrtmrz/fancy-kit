/**
 * Thinning out the execution of a function by delaying subsequent invocations
 * until a specified timeout has passed since the last invocation.
 *
 * @template T - The type of the function being throttled.
 * @param func - The function to be throttled.
 * @param timeout - The timeout value in milliseconds.
 * @returns A throttled function that delays subsequent invocations.
 */
const throttle = (func, timeout) => {
    let timer;
    let lastTime = 0; // initialize lastTime to 0
    return (...args) => {
        if (!lastTime) {
            func(...args);
            lastTime = Date.now();
        }
        else {
            clearTimeout(timer);
            const delayTime = timeout - (Date.now() - lastTime);
            timer = setTimeout(() => {
                func(...args);
                lastTime = Date.now();
            }, delayTime);
        }
    };
};

export { throttle };
//# sourceMappingURL=function.js.map
