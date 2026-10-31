import { type PromiseWithResolvers } from "../promises.ts";
/** State shared by notifier instances and the legacy adapters. */
export interface NotifierState {
    /** Resolver for the current wait group. */
    _p: PromiseWithResolvers<void>;
    /** Whether the current resolver has at least one waiter. */
    isUsed: boolean;
}
/** Creates the resolver state for one notifier instance. */
export declare function createNotifierState(): NotifierState;
/** Creates the next resolver for a legacy adapter while preserving its public fields. */
export declare function createNotifierPromise(): PromiseWithResolvers<void>;
/** Registers a waiter in the current group and returns its shared promise. */
export declare function waitForNotifierState(state: NotifierState): Promise<void>;
/** Resolves the current group and starts a fresh one; idle notifications are discarded. */
export declare function notifyNotifierState(state: NotifierState): void;
