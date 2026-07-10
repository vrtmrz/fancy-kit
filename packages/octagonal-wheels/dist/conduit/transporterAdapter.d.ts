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
declare const enum TransportResult {
    SUCCESS = 0,
    FAILURE = 1,
    NO_OP = 99
}
export declare const transporterKey = "transporterAdapter.v1";
export type TransporterPostMessageEventData<T> = {
    type: string;
    key: typeof transporterKey;
    payload: T;
};
/**
 * PostMessageBackbone is a TransporterBackbone implementation that uses the postMessage API to send and receive messages.
 * It can be used with MessageChannel, Window, Worker, or any other target that supports postMessage.
 * Note that this backbone is dedicated one to be assigned to a single transporter.
 * Please share the `MessageChannel` or `Worker` instance between multiple transporters
 * if you want to communicate with multiple transporters.
 */
export declare class PostMessageBackbone<T> implements TransporterBackbone<T> {
    constructor(channel: MessageChannel);
    constructor(receiver: TransporterTarget, transmitter?: TransporterTarget);
    _rx: TransporterTarget;
    _tx: TransporterTarget;
    _abortController: AbortController;
    _messageHandler: Map<string, (message: T) => void>;
    _onceSet: Map<string, WeakSet<(message: T) => void>>;
    _onMessageOnTarget(event: Event): TransportResult;
    /**
     * Registers a callback to be called when a message is received.
     * @param callback The function to call when a message is received.
     * @returns A function that can be called to remove the listener.
     */
    setListener(type: string, callback: (message: T) => void, opt?: {
        once?: boolean;
        signal?: AbortSignal;
    }): () => void;
    removeListener(type: string, callback: (message: T) => void): void;
    dispatchMessage(type: string, message: T): void;
    close(): void;
}
export {};
