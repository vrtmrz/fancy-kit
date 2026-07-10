import { type PromiseWithResolvers } from "../promises.ts";
import { type RequestMessage } from "./common.ts";
import { type ITransport } from "./transport.ts";
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
export declare abstract class ChannelBase {
    protected transport: ITransport;
    protected timeoutMs: number;
    protected prefix: string;
    get prefixedChannelName(): string;
    protected channelName: string;
    /**
     * Base Class for Channels
     * @param channelName unique name of the channel
     * @param transport transport instance to use (ITransport)
     * @param prefix prefix for the channel type (e.g., "port:", "broadcaster:", etc). We should set this via subclass constructor.
     */
    constructor(channelName: string, transport: ITransport, prefix: string);
    protected unsubscribes: Set<() => void>;
    /**
     * Close the channel and clean up resources.
     * This will unsubscribe all listeners associated with this channel.
     */
    close(): void;
    protected addUnsubscribe(unsubscribeCallback: () => void, signal?: AbortSignal): void;
    protected respond(OriginalMessage: RequestMessage<any>, data: {
        result?: any;
        error?: any;
    }, extra?: any): void;
    protected subscribe(listener: (data: any) => void | Promise<void>, signal?: AbortSignal, tearDown?: () => void): () => void;
    protected publish(data: any): void;
    query<T extends any[], U>(args: T, subId?: string): Promise<Awaited<U>>;
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
export declare class Port<T extends any[], U> extends ChannelBase {
    private registeredFunc;
    private unsubscribe;
    /**
     * Register a function to handle incoming requests on the Port channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void;
    /**
     * Invoke the registered function via the Port channel.
     * @param args arguments to pass to the registered function
     * @returns a promise that resolves with the result of the invocation
     */
    invoke(...args: T): Promise<Awaited<U>>;
    /**
     * Constructor for Port channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName: string, transport: ITransport);
}
/**
 * Broadcaster: Connect 1 to many but do not expect a result
 */
export declare class Broadcaster<T extends any[]> extends ChannelBase {
    /**
     * Register a function to handle incoming broadcasts on the Broadcaster channel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, any>, options?: RegisterOptions): () => void;
    /**
     * Invoke a broadcast to all registered handlers on the Broadcaster channel.
     * @param args arguments to broadcast
     * @returns a promise that resolves when the broadcast is complete (not means all handlers have completed).
     */
    invoke(...args: T): Promise<void>;
    /**
     * Constructor for Broadcaster channel
     * @param channelName unique name of the channel
     * @param transport transport layer for communication
     */
    constructor(channelName: string, transport: ITransport);
}
/**
 * MultiCastChannel: Base class for Pipeline, Switch, and Survey
 */
export declare abstract class MultiCastChannel<T extends any[], U> extends ChannelBase {
    protected knownSubscribers: Set<string>;
    protected anyAdvertisementKnown?: PromiseWithResolvers<void>;
    /**
     * Register a function to handle incoming messages on the MultiCastChannel.
     * @param func function to register
     * @param options optional RegisterOptions, including AbortSignal to unregister
     * @returns a function to unregister the handler
     */
    register(func: ChannelFunc<T, U>, options?: RegisterOptions): () => void;
    protected respond(originalMessage: RequestMessage<any>, data: {
        result?: any;
        error?: any;
    }): void;
    protected advertiseSubId(subId: string, id: string): void;
    /**
     * Constructor for MultiCastChannel
     * @param channelName The name of the channel
     * @param transport The transport layer for communication
     * @param prefix The prefix for the channel
     */
    constructor(channelName: string, transport: ITransport, prefix: string);
    /**
     * Request advertisement from other instances.
     * @returns A promise that resolves when at least one advertisement is known.
     */
    requestAdvertisement(): Promise<void>;
    /**
     * Wait until at least one advertisement is known.
     * @returns A promise that resolves when at least one advertisement is known.
     */
    waitForAnyAdvertisement(): Promise<void>;
}
/**
 * Pipeline: Connect many to many and expect all to respond true, short-circuiting on first false or error.
 * If any handler returns false or throws an error, the invocation returns false immediately.
 * If all handlers return true, the invocation returns true.
 */
export declare class Pipeline<T extends any[]> extends MultiCastChannel<T, boolean> {
    /**
     * Constructor for Pipeline channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport);
    /**
     * Invoke all registered handlers and return true only if all return true.
     */
    invoke(...args: T): Promise<boolean>;
}
/**
 * Switch: Connect many to many and expect one to respond true, and short-circuit the rest.
 * If any handler returns a non-false value, the invocation returns that value immediately.
 * If all handlers return false or throw an error, the invocation returns false.
 */
export declare class Switch<T extends any[], U> extends MultiCastChannel<T, U | false> {
    /**
     * Constructor for Switch channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport);
    /**
     * Invoke the registered functions and return the result of the first one that responds.
     * @param args arguments to pass to the registered functions
     * @returns the result of the first responding function, or false if none respond
     */
    invoke(...args: T): Promise<U | false>;
}
/**
 * Survey: Connect many to many and expect all to respond, collecting all results.
 * The invocation returns an array of promises, each resolving to the result of a handler.
 * Be aware that the results may arrive in any order, depending on the response times of the handlers (Designed for parallelism).
 */
export declare class Survey<T extends any[], U> extends MultiCastChannel<T, Promise<Awaited<U>>> {
    /**
     * Constructor for Survey channel
     * @param channelName unique name of the channel
     * @param transport The transport layer for communication
     */
    constructor(channelName: string, transport: ITransport);
    /**
     * Invoke all registered handlers and collect their results.
     * @param args arguments to pass to the registered functions
     * @returns a promise that resolves with an array of results from all handlers
     */
    invoke(...args: T): Promise<Awaited<U>>[];
}
