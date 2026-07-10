import { LSError } from "../common/error.ts";
import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";
import { MessageTypes, type ResponseMessage, type RequestMessage, generateId } from "./common.ts";

/**
 * Transport Interface for Channel Communication
 */
export interface ITransport<T = any> {
    /**
     * Subscribe to messages on a specific channel.
     * @param channelName The name of the channel to subscribe to.
     * @param listener The callback function to invoke when a message is received on the channel.
     * @return A function to unsubscribe from the channel.
     */
    subscribe(channelName: string, listener: (data: T) => void | Promise<void>): () => void;
    /**
     * Publish a message to a specific channel.
     * @param channelName The name of the channel to publish to.
     * @param data The data to send with the message.
     */
    publish(channelName: string, data: T): void;
    /**
     * Close the transport and clean up resources.
     */
    close(): void;
}

/* istanbul ignore next  -- @preserve */
function noop() {} // No operation function

/**
 * Query via Transport with Timeout and Response Handling
 * @param transport an ITransport instance
 * @param channelName the name of the channel to query
 * @param args the arguments to pass to the channel function
 * @param subId the subscriber ID to target (optional)
 * @param timeoutMs the timeout duration in milliseconds (optional)
 * @returns a promise that resolves with the result or rejects with an error
 */
export function queryViaTransport<T extends any[], U>(
    transport: ITransport,
    channelName: string,
    args: T,
    subId: string | undefined,
    timeoutMs: number
): Promise<Awaited<U>> {
    return new Promise<Awaited<U>>((resolve, reject) => {
        const id = generateId();
        let unsubscribe = noop;
        let timer: ReturnType<typeof setTimeout>;
        const commit = (result: Error | Awaited<U>) => {
            unsubscribe();
            if (timer) {
                clearTimeout(timer);
                timer = undefined!;
            }
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve(result);
            }
        };
        timer = setTimeout(() => {
            commit(new LSError(`Transport query timed out for channel "${channelName}".`));
        }, timeoutMs);
        unsubscribe = transport.subscribe(channelName, (msg: ResponseMessage<U>) => {
            if (msg?.type === MessageTypes.RESPONSE && msg.id === id && (subId === undefined || msg.subId === subId)) {
                commit(msg.error ? LSError.fromError(msg.error) : (msg.result as Awaited<U>));
            }
        });
        transport.publish(channelName, { type: MessageTypes.REQUEST, id, args, subId: subId } as RequestMessage<T>);
    });
}

/**
 * Transport Implementation: Direct Function Call
 * Used for communication within the same JavaScript process (e.g., main thread).
 * No serialization or deserialization is performed, and messages are delivered immediately.
 */
export class DirectTransport implements ITransport {
    private listeners = new Map<string, Set<(data: any) => void>>();

    subscribe(channelName: string, listener: (data: any) => void): () => void {
        if (!this.listeners.has(channelName)) {
            this.listeners.set(channelName, new Set());
        }
        const channelListeners = this.listeners.get(channelName)!;
        channelListeners.add(listener);

        return () => {
            channelListeners.delete(listener);
            if (channelListeners.size === 0) {
                this.listeners.delete(channelName);
            }
        };
    }

    publish(channelName: string, data: any): void {
        const channelListeners = this.listeners.get(channelName);
        if (channelListeners) {
            // Copy to array for safe execution even if listeners are removed during iteration
            [...channelListeners].forEach((listener) => {
                try {
                    listener(data);
                } catch (e) {
                    Logger("Error in DirectTransport listener:", LOG_LEVEL_VERBOSE);
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            });
        }
    }

    close(): void {
        this.listeners.clear();
    }
}

/**
 * Transport Implementation: BroadcastChannel
 * Used for communication between different browser tabs, windows, iframes, or workers of the same origin.
 * Messages are serialized and deserialized using the structured clone algorithm.
 * Do not pass non-cloneable objects (e.g., functions, DOM nodes) through this transport.
 */
export class BroadcastChannelTransport implements ITransport {
    private channels = new Map<string, BroadcastChannel>();

    private listeners = new Map<string, Set<(data: any) => void>>();

    private echoEnabled: boolean = true;

    constructor(enableEcho: boolean = true) {
        // If enableEcho is true, messages sent from this context will also be received by its own listeners.
        // This can be useful for testing or specific use cases.
        this.echoEnabled = enableEcho;
    }

    // Ensure a BroadcastChannel exists for the given channel name, creating it if necessary
    private getChannel(channelName: string): BroadcastChannel {
        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            return existingChannel;
        }
        // Create new BroadcastChannel and set up message listener
        const channel = new BroadcastChannel(channelName);
        channel.addEventListener("message", (event: MessageEvent) => {
            this.handleMessage(channelName, event.data);
        });
        this.channels.set(channelName, channel);
        return channel;
    }

    private handleMessage(channelName: string, data: any): void {
        this.listeners.get(channelName)?.forEach((listener) => {
            try {
                listener(data);
            } catch (e) {
                Logger("Error in BroadcastChannelTransport listener:");
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        });
    }

    subscribe(channelName: string, listener: (data: any) => void): () => void {
        this.getChannel(channelName); // Ensure channel exists
        if (!this.listeners.has(channelName)) {
            this.listeners.set(channelName, new Set());
        }

        this.listeners.get(channelName)!.add(listener);

        return () => {
            const channelListeners = this.listeners.get(channelName);
            if (channelListeners) {
                channelListeners.delete(listener);
                if (channelListeners.size === 0) {
                    this.channels.get(channelName)?.close();
                    this.channels.delete(channelName);
                    this.listeners.delete(channelName);
                }
            }
        };
    }

    publish(channelName: string, data: any): void {
        // Call getChannel to create and send even if channel does not exist
        if (this.echoEnabled) {
            this.handleMessage(channelName, data); // Also notify local listeners
        }
        this.getChannel(channelName).postMessage(data);
    }

    close(): void {
        this.channels.forEach((channel) => channel.close());
        this.channels.clear();
        this.listeners.clear();
    }
}
