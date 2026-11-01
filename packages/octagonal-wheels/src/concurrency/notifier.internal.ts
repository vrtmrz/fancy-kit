import { promiseWithResolvers, type PromiseWithResolvers } from "../promises.ts";

/** State shared by notifier instances and the legacy adapters. */
export interface NotifierState {
    /** Resolver for the current wait group. */
    _p: PromiseWithResolvers<void>;
    /** Whether the current resolver has at least one waiter. */
    isUsed: boolean;
}

/** Creates the resolver state for one notifier instance. */
export function createNotifierState(): NotifierState {
    return { _p: promiseWithResolvers<void>(), isUsed: false };
}

/** Creates the next resolver for a legacy adapter while preserving its public fields. */
export function createNotifierPromise(): PromiseWithResolvers<void> {
    return promiseWithResolvers<void>();
}

/** Registers a waiter in the current group and returns its shared promise. */
export function waitForNotifierState(state: NotifierState): Promise<void> {
    state.isUsed = true;
    return state._p.promise;
}

/** Resolves the current group and starts a fresh one; idle notifications are discarded. */
export function notifyNotifierState(state: NotifierState): void {
    if (!state.isUsed) return;
    const current = state._p;
    state.isUsed = false;
    state._p = createNotifierPromise();
    current.resolve();
}
