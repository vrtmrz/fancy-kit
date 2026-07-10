import { LSError } from '../common/error.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { generateId, MessageTypes } from './common.js';

/* istanbul ignore next  -- @preserve */
function noop() { } // No operation function
/**
 * Query via Transport with Timeout and Response Handling
 * @param transport an ITransport instance
 * @param channelName the name of the channel to query
 * @param args the arguments to pass to the channel function
 * @param subId the subscriber ID to target (optional)
 * @param timeoutMs the timeout duration in milliseconds (optional)
 * @returns a promise that resolves with the result or rejects with an error
 */
function queryViaTransport(transport, channelName, args, subId, timeoutMs) {
    return new Promise((resolve, reject) => {
        const id = generateId();
        let unsubscribe = noop;
        let timer;
        const commit = (result) => {
            unsubscribe();
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            if (result instanceof Error) {
                reject(result);
            }
            else {
                resolve(result);
            }
        };
        timer = setTimeout(() => {
            commit(new LSError(`Transport query timed out for channel "${channelName}".`));
        }, timeoutMs);
        unsubscribe = transport.subscribe(channelName, (msg) => {
            if (msg?.type === MessageTypes.RESPONSE && msg.id === id && (subId === undefined || msg.subId === subId)) {
                commit(msg.error ? LSError.fromError(msg.error) : msg.result);
            }
        });
        transport.publish(channelName, { type: MessageTypes.REQUEST, id, args, subId: subId });
    });
}
/**
 * Transport Implementation: Direct Function Call
 * Used for communication within the same JavaScript process (e.g., main thread).
 * No serialization or deserialization is performed, and messages are delivered immediately.
 */
class DirectTransport {
    constructor() {
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    subscribe(channelName, listener) {
        if (!this.listeners.has(channelName)) {
            this.listeners.set(channelName, new Set());
        }
        const channelListeners = this.listeners.get(channelName);
        channelListeners.add(listener);
        return () => {
            channelListeners.delete(listener);
            if (channelListeners.size === 0) {
                this.listeners.delete(channelName);
            }
        };
    }
    publish(channelName, data) {
        const channelListeners = this.listeners.get(channelName);
        if (channelListeners) {
            // Copy to array for safe execution even if listeners are removed during iteration
            [...channelListeners].forEach((listener) => {
                try {
                    listener(data);
                }
                catch (e) {
                    Logger("Error in DirectTransport listener:", LOG_LEVEL_VERBOSE);
                    Logger(e, LOG_LEVEL_VERBOSE);
                }
            });
        }
    }
    close() {
        this.listeners.clear();
    }
}
/**
 * Transport Implementation: BroadcastChannel
 * Used for communication between different browser tabs, windows, iframes, or workers of the same origin.
 * Messages are serialized and deserialized using the structured clone algorithm.
 * Do not pass non-cloneable objects (e.g., functions, DOM nodes) through this transport.
 */
class BroadcastChannelTransport {
    constructor(enableEcho = true) {
        Object.defineProperty(this, "channels", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "echoEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        // If enableEcho is true, messages sent from this context will also be received by its own listeners.
        // This can be useful for testing or specific use cases.
        this.echoEnabled = enableEcho;
    }
    // Ensure a BroadcastChannel exists for the given channel name, creating it if necessary
    getChannel(channelName) {
        const existingChannel = this.channels.get(channelName);
        if (existingChannel) {
            return existingChannel;
        }
        // Create new BroadcastChannel and set up message listener
        const channel = new BroadcastChannel(channelName);
        channel.addEventListener("message", (event) => {
            this.handleMessage(channelName, event.data);
        });
        this.channels.set(channelName, channel);
        return channel;
    }
    handleMessage(channelName, data) {
        this.listeners.get(channelName)?.forEach((listener) => {
            try {
                listener(data);
            }
            catch (e) {
                Logger("Error in BroadcastChannelTransport listener:");
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        });
    }
    subscribe(channelName, listener) {
        this.getChannel(channelName); // Ensure channel exists
        if (!this.listeners.has(channelName)) {
            this.listeners.set(channelName, new Set());
        }
        this.listeners.get(channelName).add(listener);
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
    publish(channelName, data) {
        // Call getChannel to create and send even if channel does not exist
        if (this.echoEnabled) {
            this.handleMessage(channelName, data); // Also notify local listeners
        }
        this.getChannel(channelName).postMessage(data);
    }
    close() {
        this.channels.forEach((channel) => channel.close());
        this.channels.clear();
        this.listeners.clear();
    }
}

export { BroadcastChannelTransport, DirectTransport, queryViaTransport };
//# sourceMappingURL=transport.js.map
