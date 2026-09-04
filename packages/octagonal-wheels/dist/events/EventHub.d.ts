export type EventTypeWithData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? never : K extends string ? K : never : never;
export type EventTypeWithoutData<ET, K> = K extends keyof ET ? ET[K] extends undefined ? K extends string ? K : never : never : never;
export type EventType<K> = K extends string ? K : never;
export type EventDataType<ET extends Record<string, any>, K extends keyof ET> = ET[K] extends undefined ? undefined : ET[K];
/**
 * A class that provides an event hub for managing custom events.
 *
 * @template Events - The type of events that the EventHub will handle. This type should be an object with event names as keys and event data types as values. This make all events strongly typed.
 */
export declare class EventHub<Events extends AnyHubEvents = LSEvents> {
    /**
     * The event emitter used to dispatch and listen for events.
     *
     * @private
     */
    private _emitter;
    /**
     * Creates an instance of the EventHub.
     * @param emitter - An optional EventTarget to use as the event emitter. If not provided, a dedicated new EventTarget will be created. i.e., it can share the same emitter with other EventHubs (e.g., for a global event bus, or separately built apps via window object).
     */
    constructor(emitter?: EventTarget);
    private _assigned;
    private _allAssigned;
    private _issueSignal;
    private _listen;
    /**
     * Emits an event without data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to emit.
     */
    emitEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>): void;
    /**
     * Emits an event with data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param data - data to include with the event.
     * @param event - The event to emit.
     */
    emitEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>, data: ET[K]): void;
    /**
     * Registers an event listener for a specific event.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. A supplied signal removes only this registration when aborted.
     * @returns An idempotent function that removes only this registration.
     */
    on<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>, callback: (e: Event) => void | Promise<void>, options?: AddEventListenerOptions): () => void;
    /**
     * Registers an event listener for a specific event.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. A supplied signal removes only this registration when aborted.
     * @returns An idempotent function that removes only this registration.
     */
    on<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>, callback: (e: Event, data: ET[K]) => void | Promise<void>, options?: AddEventListenerOptions): () => void;
    /**
     * Removes current event registrations in bulk.
     *
     * Prefer the disposer returned by `on`, `onEvent`, `once`, or `onceEvent` when removing one registration.
     *
     * @param event - The event whose registrations should be removed.
     * @param callback - The callback whose registrations should be removed. Omit it to remove every registration for the event.
     */
    off<ET extends Events, K extends keyof ET>(event: EventType<K>, callback?: CallableFunction): void;
    /**
     * Removes all event listeners.
     */
    offAll(): void;
    /**
     * Registers an event listener for a specific event, with a callback that only receives the event data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. A supplied signal removes only this registration when aborted.
     * @returns An idempotent function that removes only this registration.
     */
    onEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>, callback: () => any, options?: AddEventListenerOptions): () => void;
    /**
     * Registers an event listener for a specific event, with a callback that only receives the event data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. A supplied signal removes only this registration when aborted.
     * @returns An idempotent function that removes only this registration.
     */
    onEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>, callback: (data: ET[K]) => any, options?: AddEventListenerOptions): () => void;
    /**
     * Registers a one-time event listener for a specific event.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. The `once` option is always treated as `true`.
     * @returns An idempotent function that removes only this registration.
     */
    once<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>, callback: (e: Event) => void, options?: AddEventListenerOptions): () => void;
    /**
     * Registers a one-time event listener for a specific event.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. The `once` option is always treated as `true`.
     * @returns An idempotent function that removes only this registration.
     */
    once<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>, callback: (e: Event, data: ET[K]) => void, options?: AddEventListenerOptions): () => void;
    /**
     * Registers a one-time event listener for a specific event, with a callback that only receives the event data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. The `once` option is always treated as `true`.
     * @returns An idempotent function that removes only this registration.
     */
    onceEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>, callback: () => void, options?: AddEventListenerOptions): () => void;
    /**
     * Registers a one-time event listener for a specific event, with a callback that only receives the event data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to listen for.
     * @param callback - The callback to execute when the event is triggered.
     * @param options - Native `EventTarget` listener options. The `once` option is always treated as `true`.
     * @returns An idempotent function that removes only this registration.
     */
    onceEvent<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>, callback: (data: ET[K]) => void, options?: AddEventListenerOptions): () => void;
    /**
     * Waits for a specific event to be emitted.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to wait for.
     * @returns A Promise that resolves with null.
     */
    waitFor<ET extends Events, K extends keyof ET>(event: EventTypeWithoutData<ET, K>): Promise<null>;
    /**
     * Waits for a specific event to be emitted and returns a promise that resolves with the event data.
     *
     * @template ET - The type of events.
     * @template K - The key of the event.
     * @param event - The event to wait for.
     * @returns A promise that resolves with the event data.
     */
    waitFor<ET extends Events, K extends keyof ET>(event: EventTypeWithData<ET, K>): Promise<ET[K]>;
}
