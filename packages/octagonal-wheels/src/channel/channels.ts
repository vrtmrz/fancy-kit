import { LSError } from "../common/error.ts";
import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";
import { promiseWithResolvers, type PromiseWithResolvers } from "../promises.ts";
import {
    type RequestMessage,
    type ResponseMessage,
    type BroadcastMessage,
    type ByeMessage,
    type AdvertiseMessage,
    DEFAULT_QUERY_TIMEOUT_MS,
    generateId,
    MessageTypes,
    type RequestAdvertiseMessage,
} from "./common.ts";
import { type ITransport, queryViaTransport } from "./transport.ts";

/* istanbul ignore next  -- @preserve */
function noop() {} // No operation function

/**
 * Function type for channel registration and invocation
 */
export type ChannelFunc<T extends any[], U> = (...args: T) => Promise<Awaited<U>>;

/**
 * Options for registering a function to a channel
 */
export type RegisterOptions = {
    signal?: AbortSignal;
};

/**
 * Base class for channel types
 */
export abstract class ChannelBase {
    // Default timeout for queries
    protected timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS;
    // Prefix for channel names to avoid collisions between different channel types
    protected prefix;
    // Full channel name with prefix
    get prefixedChannelName() {
        return this.prefix + this.channelName;
    }
    protected channelName: string;

    /**
     * Base Class for Channels
     * @param channelName unique name of the channel
     * @param transport transport instance to use (ITransport)
     * @param prefix prefix for the channel type (e.g., "port:", "broadcaster:", etc). We should set this via subclass constructor.
     */
    constructor(
        channelName: string,
        protected transport: ITransport,
        prefix: string
    ) {
        this.prefix = prefix;
        this.channelName = channelName;
    }

    // To keep track of unsubscribe functions for all subscriptions
    protected unsubscribes: Set<() => void> = new Set();

    /**
     * Close the channel and clean up resources.
     * This will unsubscribe all listeners associated with this channel.
     */
    close(): void {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
        this.unsubscribes.clear();
    }

    // Add an unsubscribe function to the set and handle AbortSignal if provided
    protected addUnsubscribe(unsubscribeCallback: () => void, signal?: AbortSignal) {
        this.unsubscribes.add(unsubscribeCallback);
        if (signal) {
            signal.addEventListener(
                "abort",
                () => {
                    unsubscribeCallback();
                    this.unsubscribes.delete(unsubscribeCallback);
                },
                { once: true }
            );
        }
    }

    // Respond to a request message
    protected respond(OriginalMessage: RequestMessage<any>, data: { result?: any; error?: any }, extra = {} as any) {
        this.transport.publish(this.prefixedChannelName, {
            type: MessageTypes.RESPONSE,
            id: OriginalMessage.id,
            result: data.result,
            error: data.error,
            ...extra,
        } as ResponseMessage<any>);
    }

    // Subscribe to messages on the channel
    protected subscribe(
        listener: (data: any) => void | Promise<void>,
        signal?: AbortSignal,
        tearDown?: () => void
    ): () => void {
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
    protected publish(data: any): void {
        this.transport.publish(this.prefixedChannelName, data);
    }

    // Query the channel and wait for a response
    query<T extends any[], U>(args: T, subId?: string): Promise<Awaited<U>> {
        return queryViaTransport<T, U>(this.transport, this.prefixedChannelName, args, subId, this.timeoutMs);
    }

    /**
     * Register a function to handle incoming requests on the channel.
     * @param func async function to handle requests
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    abstract register(func: ChannelFunc<any, any>, options?: RegisterOptions): () => void;

    /**
     * Invoke function(s) via channel with the provided arguments.
     * @param args arguments to pass to the registered function(s)
     * @returns a promise that resolves with the result(s) of the invocation
     */
    abstract invoke(...args: any[]): any;
}

/**
 * Port: Connect 1 to 1 and expect a result
 */
export class Port<T extends any[], U> extends ChannelBase {
    // Currently registered function.
    private registeredFunc: ChannelFunc<T, U> | null = null;

    // Unsubscribe function for the current registration
    private unsubscribe = noop;

    /**
     * Register a function to handle incoming requests on the Port channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void {
        if (this.registeredFunc) {
            Logger(`A function is already registered for Port channel "${this.channelName}". Overwriting.`);
            this.registeredFunc = func;
            return this.unsubscribe;
        } else {
            Logger(`Function registered for Port channel "${this.channelName}".`);
        }
        this.registeredFunc = func;

        const listener = async (msg: RequestMessage<T> | ResponseMessage<U>) => {
            if (msg?.type === MessageTypes.REQUEST) {
                try {
                    const result = await this.registeredFunc!(...msg.args);
                    this.respond(msg, { result });
                } catch (e) {
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
    invoke(...args: T): Promise<Awaited<U>> {
        return this.query(args);
    }

    /**
     * Constructor for Port channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName: string, transport: ITransport) {
        super(channelName, transport, "port:");
    }
}

/**
 * Broadcaster: Connect 1 to many but do not expect a result
 */
export class Broadcaster<T extends any[]> extends ChannelBase {
    /**
     * Register a function to handle incoming broadcasts on the Broadcaster channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, any>, options?: RegisterOptions): () => void {
        const listener = async (msg: BroadcastMessage<T>) => {
            if (msg?.type === MessageTypes.BROADCAST) {
                try {
                    await func(...msg.args);
                } catch (e: any) {
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
    invoke(...args: T): Promise<void> {
        this.publish({ type: MessageTypes.BROADCAST, args } as BroadcastMessage<T>);
        return Promise.resolve();
    }

    /**
     * Constructor for Broadcaster channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName: string, transport: ITransport) {
        super(channelName, transport, "broadcaster:");
    }
}

/**
 * MultiCastChannel: Base class for Pipeline, Switch, and Survey
 */
export abstract class MultiCastChannel<T extends any[], U> extends ChannelBase {
    // Keep track of known subscribers
    protected knownSubscribers = new Set<string>();
    protected anyAdvertisementKnown?: PromiseWithResolvers<void>;
    /**
     * Register a function to handle incoming messages on the MultiCastChannel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void {
        const subId = generateId();
        this.advertiseSubId(subId, subId); // Advertise ourselves immediately
        const listener = async (msg: RequestMessage<T> | RequestAdvertiseMessage) => {
            if (!msg?.type) return;
            if (msg.type === MessageTypes.REQUEST && msg.subId == subId) {
                try {
                    const result = await func(...msg.args);
                    this.respond(msg, { result });
                } catch (e: any) {
                    this.respond(msg, { error: LSError.fromError(e) });
                }
            } else if (msg.type === MessageTypes.REQUEST_AD) {
                this.advertiseSubId(subId, msg.id);
            }
        };
        const tearDown = () => {
            // Send BYE message on unregister
            this.publish({ type: MessageTypes.BYE, id: subId, subId } as ByeMessage);
            this.knownSubscribers.delete(subId);
        };
        const unsubscribe = this.subscribe(listener, options?.signal, tearDown);
        return unsubscribe;
    }

    // Override respond to include subId
    protected override respond(originalMessage: RequestMessage<any>, data: { result?: any; error?: any }): void {
        super.respond(originalMessage, data, { subId: originalMessage.subId });
    }

    // Advertise our subId to other instances
    protected advertiseSubId(subId: string, id: string): void {
        this.publish({ type: MessageTypes.ADVERTISE, id, subId } as AdvertiseMessage);
    }

    /**
     * Constructor for MultiCastChannel
     * @param channelName The name of the channel
     * @param transport The transport layer for communication
     * @param prefix The prefix for the channel
     */
    constructor(channelName: string, transport: ITransport, prefix: string) {
        super(channelName, transport, prefix);
        this.subscribe((msg: AdvertiseMessage | ByeMessage) => {
            if (msg?.type === MessageTypes.ADVERTISE && msg.subId) {
                this.anyAdvertisementKnown?.resolve();
                this.anyAdvertisementKnown = undefined;
                this.knownSubscribers.add(msg.subId);
            } else if (msg?.type === MessageTypes.BYE && msg.subId) {
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
            this.anyAdvertisementKnown = promiseWithResolvers<void>();
            promise = this.anyAdvertisementKnown.promise;
        }
        this.publish({ type: MessageTypes.REQUEST_AD, id: generateId() } as RequestAdvertiseMessage);
        return promise;
    }
    /**
     * Wait until at least one advertisement is known.
     * @returns A promise that resolves when at least one advertisement is known.
     */
    waitForAnyAdvertisement(): Promise<void> {
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
export class Pipeline<T extends any[]> extends MultiCastChannel<T, boolean> {
    /**
     * Constructor for Pipeline channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport) {
        super(channelName, transport, "pipeline:");
    }
    /**
     * Invoke all registered handlers and return true only if all return true.
     */
    async invoke(...args: T): Promise<boolean> {
        for (const subId of this.knownSubscribers) {
            try {
                const result = await this.query(args, subId);
                if (result === false) {
                    return false; // If any returns false, fail immediately
                }
            } catch (e) {
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
export class Switch<T extends any[], U> extends MultiCastChannel<T, U | false> {
    /**
     * Constructor for Switch channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport) {
        super(channelName, transport, "switch:");
    }

    /**
     * Invoke the registered functions and return the result of the first one that responds.
     * @param args arguments to pass to the registered functions
     * @returns the result of the first responding function, or false if none respond
     */
    async invoke(...args: T): Promise<U | false> {
        for (const subId of this.knownSubscribers) {
            try {
                const result = await this.query<T, U>(args, subId);
                if (result !== false) {
                    return result; // If any returns non-false, return immediately
                }
            } catch (e) {
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
export class Survey<T extends any[], U> extends MultiCastChannel<T, Promise<Awaited<U>>> {
    /**
     * Constructor for Survey channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport) {
        super(channelName, transport, "survey:");
    }

    /**
     * Invoke all registered handlers and collect their results.
     * @param args arguments to pass to the registered functions
     * @returns a promise that resolves with an array of results from all handlers
     */
    invoke(...args: T): Promise<Awaited<U>>[] {
        const results: Promise<Awaited<U>>[] = [];
        for (const subId of this.knownSubscribers) {
            const result = this.query<T, U>(args, subId);
            results.push(result);
        }
        return results;
    }
}
