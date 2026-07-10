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
/**
 * Query via Transport with Timeout and Response Handling
 * @param transport an ITransport instance
 * @param channelName the name of the channel to query
 * @param args the arguments to pass to the channel function
 * @param subId the subscriber ID to target (optional)
 * @param timeoutMs the timeout duration in milliseconds (optional)
 * @returns a promise that resolves with the result or rejects with an error
 */
export declare function queryViaTransport<T extends any[], U>(transport: ITransport, channelName: string, args: T, subId: string | undefined, timeoutMs: number): Promise<Awaited<U>>;
/**
 * Transport Implementation: Direct Function Call
 * Used for communication within the same JavaScript process (e.g., main thread).
 * No serialization or deserialization is performed, and messages are delivered immediately.
 */
export declare class DirectTransport implements ITransport {
    private listeners;
    subscribe(channelName: string, listener: (data: any) => void): () => void;
    publish(channelName: string, data: any): void;
    close(): void;
}
/**
 * Transport Implementation: BroadcastChannel
 * Used for communication between different browser tabs, windows, iframes, or workers of the same origin.
 * Messages are serialized and deserialized using the structured clone algorithm.
 * Do not pass non-cloneable objects (e.g., functions, DOM nodes) through this transport.
 */
export declare class BroadcastChannelTransport implements ITransport {
    private channels;
    private listeners;
    private echoEnabled;
    constructor(enableEcho?: boolean);
    private getChannel;
    private handleMessage;
    subscribe(channelName: string, listener: (data: any) => void): () => void;
    publish(channelName: string, data: any): void;
    close(): void;
}
