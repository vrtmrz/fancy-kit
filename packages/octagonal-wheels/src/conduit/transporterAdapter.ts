import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";

export interface ListenerOptions {
    once?: boolean;
    signal?: AbortSignal;
}
export interface TransporterBackbone<T> {
    setListener: (type: string, callback: (message: T) => void, options?: ListenerOptions) => () => void;
    removeListener: (type: string, callback: (message: T) => void) => void;
    dispatchMessage: (type: string, message: T) => void;
    close: () => void;
}

export type TransporterTarget = Window | Worker | MessagePort | ServiceWorker | typeof globalThis;
const enum TransportResult {
    SUCCESS,
    FAILURE,
    NO_OP = 99,
}
const protocolVersion = 1;
export const transporterKey = `transporterAdapter.v${protocolVersion}`;
export type TransporterPostMessageEventData<T> = {
    type: string;
    key: typeof transporterKey;
    payload: T;
};

// const DefaultTransferOrigin = "https://vrtmrz.net/octagonal-wheels/conduit";

/**
 * PostMessageBackbone is a TransporterBackbone implementation that uses the postMessage API to send and receive messages.
 * It can be used with MessageChannel, Window, Worker, or any other target that supports postMessage.
 * Note that this backbone is dedicated one to be assigned to a single transporter.
 * Please share the `MessageChannel` or `Worker` instance between multiple transporters
 * if you want to communicate with multiple transporters.
 */
export class PostMessageBackbone<T> implements TransporterBackbone<T> {
    constructor(channel: MessageChannel);
    constructor(receiver: TransporterTarget, transmitter?: TransporterTarget);
    constructor(receiver: TransporterTarget | MessageChannel, transmitter?: TransporterTarget) {
        if (receiver instanceof MessageChannel) {
            // If a MessageChannel is provided, use its ports as the receiver and transmitter.
            this._tx = receiver.port1;
            this._rx = receiver.port2;
            this._tx.start();
            this._rx.start();
        } else {
            // If receiver and transmitter are provided, use them directly.
            this._rx = receiver;
            // If no transmitter is provided, use the receiver as the transmitter.
            // e.g., using inside a Worker or Window context. (Window can both send and receive messages)
            this._tx = transmitter || receiver;
        }

        this._onMessageOnTarget = this._onMessageOnTarget.bind(this);
        this._rx.addEventListener("message", this._onMessageOnTarget, {
            signal: this._abortController.signal,
        });
    }

    _rx: TransporterTarget;
    _tx: TransporterTarget; // In this case, we assume the same target for receiving and sending messages.

    _abortController: AbortController = new AbortController();

    // Map to hold message handlers for different message types.
    // Keep in mind that multiple handlers cannot be assigned to the same type.
    // If you want to have multiple handlers for the same type, please wrap functions in a single handler or use `Manifold` to handle multiple handlers.
    // And, if you want to wait to the connection, please use `Connector` to wait for the connection to be established.
    _messageHandler: Map<string, (message: T) => void> = new Map();
    // Map to hold one-time message handlers for different message types.
    _onceSet: Map<string, WeakSet<(message: T) => void>> = new Map();

    _onMessageOnTarget(event: Event): TransportResult {
        // On event received, we check if the abort signal has been triggered.
        // (Note that this happen so rarely, Because we aborted after removing handler)
        if (this._abortController.signal.aborted) {
            // If the abort signal is triggered, we ignore the message.
            Logger("TransporterAdapterPostMessage: Target aborted, ignoring message.", LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }

        const { data } = event as MessageEvent<TransporterPostMessageEventData<T>>;
        if (!data || !data.payload || !data.key) {
            // Logger(`TransporterAdapterPostMessage: Received a message without payload or key, ignoring.`, LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }
        const { type, payload, key } = data;
        if (key !== transporterKey) {
            // This is not a message for this transporter, ignore it.
            return TransportResult.NO_OP;
        }

        const handler = this._messageHandler.get(type);
        if (!handler) {
            // Logger(`TransporterAdapterPostMessage: No handlers registered for message type: ${type}`, LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }
        // console.log(`Handling message of type ${type} with payload:`, payload);

        try {
            handler(payload);
        } catch (error) {
            Logger(`Error handling message of type ${type}:`, LOG_LEVEL_VERBOSE);
            Logger(error, LOG_LEVEL_VERBOSE);
            // throw new Error(`TransporterAdapterPostMessage: Error handling message of type ${type}: ${error instanceof Error ? error.message : `${error}`}`);
        } finally {
            // If the handler is a one-time handler, remove it after handling the message.
            if (this._onceSet.has(type) && this._onceSet.get(type)!.has(handler)) {
                this._onceSet.get(type)?.delete(handler);
                this.removeListener(type, handler);
            }
        }
        event.stopPropagation();
        event.preventDefault();
        return TransportResult.SUCCESS;
    }

    /**
     * Registers a callback to be called when a message is received.
     * @param callback The function to call when a message is received.
     * @returns A function that can be called to remove the listener.
     */
    setListener(
        type: string,
        callback: (message: T) => void,
        opt: { once?: boolean; signal?: AbortSignal } = {}
    ): () => void {
        // console.log(`Setting listener for type: ${type}`);
        this._messageHandler.set(type, callback);
        if (opt.once) {
            const onceSet = this._onceSet.get(type) || new WeakSet<(message: T) => void>();
            onceSet.add(callback);
            this._onceSet.set(type, onceSet);
        }
        if (opt.signal) {
            opt.signal.addEventListener("abort", () => {
                this.removeListener(type, callback);
            });
        }
        return () => {
            this.removeListener(type, callback);
            return this;
        };
    }
    removeListener(type: string, callback: (message: T) => void): void {
        if (this._messageHandler.get(type) === callback) {
            this._messageHandler.delete(type);
            if (this._onceSet.has(type)) {
                this._onceSet.get(type)?.delete(callback);
            }
        }
        // else {
        //     // Possibly not needed, but useful for debugging
        //     // console.warn(`TransporterAdapterPostMessage: No handler registered for type: ${type}`);
        // }
    }

    dispatchMessage(type: string, message: T): void {
        try {
            this._tx.postMessage(
                { type, payload: message, key: transporterKey } as TransporterPostMessageEventData<T>,
                {
                    // targetOrigin: "*"
                }
            );
        } catch (error) {
            Logger(`Error dispatching message of type ${type}:`, LOG_LEVEL_VERBOSE);
            Logger(error, LOG_LEVEL_VERBOSE);
        }
    }

    close() {
        this._rx.removeEventListener("message", this._onMessageOnTarget);
        this._abortController.abort();
        this._messageHandler.clear();
    }
}
