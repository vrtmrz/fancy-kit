import { LSError } from '../common/error.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { promiseWithResolvers } from '../promises.js';
import { MessageTypes, DEFAULT_QUERY_TIMEOUT_MS, generateId } from './common.js';
import { queryViaTransport } from './transport.js';

/* istanbul ignore next  -- @preserve */
function noop() { } // No operation function
/**
 * Base class for channel types
 */
class ChannelBase {
    // Full channel name with prefix
    get prefixedChannelName() {
        return this.prefix + this.channelName;
    }
    /**
     * Base Class for Channels
     * @param channelName unique name of the channel
     * @param transport transport instance to use (ITransport)
     * @param prefix prefix for the channel type (e.g., "port:", "broadcaster:", etc). We should set this via subclass constructor.
     */
    constructor(channelName, transport, prefix) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: transport
        });
        // Default timeout for queries
        Object.defineProperty(this, "timeoutMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: DEFAULT_QUERY_TIMEOUT_MS
        });
        // Prefix for channel names to avoid collisions between different channel types
        Object.defineProperty(this, "prefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "channelName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // To keep track of unsubscribe functions for all subscriptions
        Object.defineProperty(this, "unsubscribes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        this.prefix = prefix;
        this.channelName = channelName;
    }
    /**
     * Close the channel and clean up resources.
     * This will unsubscribe all listeners associated with this channel.
     */
    close() {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
        this.unsubscribes.clear();
    }
    // Add an unsubscribe function to the set and handle AbortSignal if provided
    addUnsubscribe(unsubscribeCallback, signal) {
        this.unsubscribes.add(unsubscribeCallback);
        if (signal) {
            signal.addEventListener("abort", () => {
                unsubscribeCallback();
                this.unsubscribes.delete(unsubscribeCallback);
            }, { once: true });
        }
    }
    // Respond to a request message
    respond(OriginalMessage, data, extra = {}) {
        this.transport.publish(this.prefixedChannelName, {
            type: MessageTypes.RESPONSE,
            id: OriginalMessage.id,
            result: data.result,
            error: data.error,
            ...extra,
        });
    }
    // Subscribe to messages on the channel
    subscribe(listener, signal, tearDown) {
        const _unsubscribe = this.transport.subscribe(this.prefixedChannelName, listener);
        const unsubscribe = () => {
            this.unsubscribes.delete(unsubscribe);
            _unsubscribe();
            tearDown?.();
        };
        this.addUnsubscribe(unsubscribe, signal);
        return unsubscribe;
    }
    // publish a message to the channel
    publish(data) {
        this.transport.publish(this.prefixedChannelName, data);
    }
    // Query the channel and wait for a response
    query(args, subId) {
        return queryViaTransport(this.transport, this.prefixedChannelName, args, subId, this.timeoutMs);
    }
}
/**
 * Port: Connect 1 to 1 and expect a result
 */
class Port extends ChannelBase {
    /**
     * Register a function to handle incoming requests on the Port channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func, options) {
        if (this.registeredFunc) {
            Logger(`A function is already registered for Port channel "${this.channelName}". Overwriting.`);
            this.registeredFunc = func;
            return this.unsubscribe;
        }
        else {
            Logger(`Function registered for Port channel "${this.channelName}".`);
        }
        this.registeredFunc = func;
        const listener = async (msg) => {
            if (msg?.type === MessageTypes.REQUEST) {
                try {
                    const result = await this.registeredFunc(...msg.args);
                    this.respond(msg, { result });
                }
                catch (e) {
                    const error = LSError.fromError(e);
                    this.respond(msg, { error });
                }
            }
        };
        const tearDown = () => {
            this.registeredFunc = null;
            this.unsubscribe = noop;
        };
        this.unsubscribe = this.subscribe(listener, options?.signal, tearDown);
        return this.unsubscribe;
    }
    /**
     * Invoke the registered function via the Port channel.
     * @param args arguments to pass to the registered function
     * @returns a promise that resolves with the result of the invocation
     */
    invoke(...args) {
        return this.query(args);
    }
    /**
     * Constructor for Port channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName, transport) {
        super(channelName, transport, "port:");
        // Currently registered function.
        Object.defineProperty(this, "registeredFunc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // Unsubscribe function for the current registration
        Object.defineProperty(this, "unsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: noop
        });
    }
}
/**
 * Broadcaster: Connect 1 to many but do not expect a result
 */
class Broadcaster extends ChannelBase {
    /**
     * Register a function to handle incoming broadcasts on the Broadcaster channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func, options) {
        const listener = async (msg) => {
            if (msg?.type === MessageTypes.BROADCAST) {
                try {
                    await func(...msg.args);
                }
                catch (e) {
                    Logger("Error in Broadcaster handler");
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            }
        };
        const unsubscribe = this.subscribe(listener, options?.signal);
        return unsubscribe;
    }
    /**
     * Invoke a broadcast to all registered handlers on the Broadcaster channel.
     * @param args arguments to broadcast
     * @returns a promise that resolves when the broadcast is complete (not means all handlers have completed).
     */
    invoke(...args) {
        this.publish({ type: MessageTypes.BROADCAST, args });
        return Promise.resolve();
    }
    /**
     * Constructor for Broadcaster channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName, transport) {
        super(channelName, transport, "broadcaster:");
    }
}
/**
 * MultiCastChannel: Base class for Pipeline, Switch, and Survey
 */
class MultiCastChannel extends ChannelBase {
    /**
     * Register a function to handle incoming messages on the MultiCastChannel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func, options) {
        const subId = generateId();
        this.advertiseSubId(subId, subId); // Advertise ourselves immediately
        const listener = async (msg) => {
            if (!msg?.type)
                return;
            if (msg.type === MessageTypes.REQUEST && msg.subId == subId) {
                try {
                    const result = await func(...msg.args);
                    this.respond(msg, { result });
                }
                catch (e) {
                    this.respond(msg, { error: LSError.fromError(e) });
                }
            }
            else if (msg.type === MessageTypes.REQUEST_AD) {
                this.advertiseSubId(subId, msg.id);
            }
        };
        const tearDown = () => {
            // Send BYE message on unregister
            this.publish({ type: MessageTypes.BYE, id: subId, subId });
            this.knownSubscribers.delete(subId);
        };
        const unsubscribe = this.subscribe(listener, options?.signal, tearDown);
        return unsubscribe;
    }
    // Override respond to include subId
    respond(originalMessage, data) {
        super.respond(originalMessage, data, { subId: originalMessage.subId });
    }
    // Advertise our subId to other instances
    advertiseSubId(subId, id) {
        this.publish({ type: MessageTypes.ADVERTISE, id, subId });
    }
    /**
     * Constructor for MultiCastChannel
     * @param channelName The name of the channel
     * @param transport The transport layer for communication
     * @param prefix The prefix for the channel
     */
    constructor(channelName, transport, prefix) {
        super(channelName, transport, prefix);
        // Keep track of known subscribers
        Object.defineProperty(this, "knownSubscribers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "anyAdvertisementKnown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.subscribe((msg) => {
            if (msg?.type === MessageTypes.ADVERTISE && msg.subId) {
                this.anyAdvertisementKnown?.resolve();
                this.anyAdvertisementKnown = undefined;
                this.knownSubscribers.add(msg.subId);
            }
            else if (msg?.type === MessageTypes.BYE && msg.subId) {
                this.knownSubscribers.delete(msg.subId);
            }
        });
        void this.requestAdvertisement();
    }
    /**
     * Request advertisement from other instances.
     * @returns A promise that resolves when at least one advertisement is known.
     */
    requestAdvertisement() {
        let promise = this.anyAdvertisementKnown?.promise;
        if (!promise) {
            this.anyAdvertisementKnown = promiseWithResolvers();
            promise = this.anyAdvertisementKnown.promise;
        }
        this.publish({ type: MessageTypes.REQUEST_AD, id: generateId() });
        return promise;
    }
    /**
     * Wait until at least one advertisement is known.
     * @returns A promise that resolves when at least one advertisement is known.
     */
    waitForAnyAdvertisement() {
        if (this.knownSubscribers.size > 0) {
            return Promise.resolve();
        }
        if (!this.anyAdvertisementKnown?.promise) {
            return this.requestAdvertisement();
        }
        return this.anyAdvertisementKnown.promise;
    }
}
// -- Pipeline: Connect many to 1 and expect all to respond true --
/**
 * Pipeline: Connect many to many and expect all to respond true, short-circuiting on first false or error.
 * If any handler returns false or throws an error, the invocation returns false immediately.
 * If all handlers return true, the invocation returns true.
 */
class Pipeline extends MultiCastChannel {
    /**
     * Constructor for Pipeline channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName, transport) {
        super(channelName, transport, "pipeline:");
    }
    /**
     * Invoke all registered handlers and return true only if all return true.
     */
    async invoke(...args) {
        for (const subId of this.knownSubscribers) {
            try {
                const result = await this.query(args, subId);
                if (result === false) {
                    return false; // If any returns false, fail immediately
                }
            }
            catch (e) {
                Logger("Error querying subscriber in Pipeline");
                Logger(e, LOG_LEVEL_VERBOSE);
                return false; // On error, consider it a failure
            }
        }
        return true; // All known subscribers responded true
    }
}
/**
 * Switch: Connect many to many and expect one to respond true, and short-circuit the rest.
 * If any handler returns a non-false value, the invocation returns that value immediately.
 * If all handlers return false or throw an error, the invocation returns false.
 */
class Switch extends MultiCastChannel {
    /**
     * Constructor for Switch channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName, transport) {
        super(channelName, transport, "switch:");
    }
    /**
     * Invoke the registered functions and return the result of the first one that responds.
     * @param args arguments to pass to the registered functions
     * @returns the result of the first responding function, or false if none respond
     */
    async invoke(...args) {
        for (const subId of this.knownSubscribers) {
            try {
                const result = await this.query(args, subId);
                if (result !== false) {
                    return result; // If any returns non-false, return immediately
                }
            }
            catch (e) {
                Logger("Error querying subscriber in Switch");
                Logger(e, LOG_LEVEL_VERBOSE);
                // On error, continue to next subscriber
            }
        }
        return false; // All known subscribers responded false
    }
}
/**
 * Survey: Connect many to many and expect all to respond, collecting all results.
 * The invocation returns an array of promises, each resolving to the result of a handler.
 * Be aware that the results may arrive in any order, depending on the response times of the handlers (Designed for parallelism).
 */
class Survey extends MultiCastChannel {
    /**
     * Constructor for Survey channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName, transport) {
        super(channelName, transport, "survey:");
    }
    /**
     * Invoke all registered handlers and collect their results.
     * @param args arguments to pass to the registered functions
     * @returns a promise that resolves with an array of results from all handlers
     */
    invoke(...args) {
        const results = [];
        for (const subId of this.knownSubscribers) {
            const result = this.query(args, subId);
            results.push(result);
        }
        return results;
    }
}

export { Broadcaster, ChannelBase, MultiCastChannel, Pipeline, Port, Survey, Switch };
//# sourceMappingURL=channels.js.map
