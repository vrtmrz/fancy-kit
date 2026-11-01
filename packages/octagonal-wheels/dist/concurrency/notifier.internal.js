import { promiseWithResolvers } from '../promises.js';

/** Creates the resolver state for one notifier instance. */
function createNotifierState() {
    return { _p: promiseWithResolvers(), isUsed: false };
}
/** Creates the next resolver for a legacy adapter while preserving its public fields. */
function createNotifierPromise() {
    return promiseWithResolvers();
}
/** Registers a waiter in the current group and returns its shared promise. */
function waitForNotifierState(state) {
    state.isUsed = true;
    return state._p.promise;
}
/** Resolves the current group and starts a fresh one; idle notifications are discarded. */
function notifyNotifierState(state) {
    if (!state.isUsed)
        return;
    const current = state._p;
    state.isUsed = false;
    state._p = createNotifierPromise();
    current.resolve();
}

export { createNotifierPromise, createNotifierState, notifyNotifierState, waitForNotifierState };
//# sourceMappingURL=notifier.internal.js.map
