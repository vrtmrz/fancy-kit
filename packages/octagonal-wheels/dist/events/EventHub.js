import { FallbackWeakRef } from '../common/polyfill.js';

/**
 * A class that provides an event hub for managing custom events.
 *
 * @template Events - The type of events that the EventHub will handle. This type should be an object with event names as keys and event data types as values. This make all events strongly typed.
 */
class EventHub {
    /**
     * Creates an instance of the EventHub.
     * @param emitter - An optional EventTarget to use as the event emitter. If not provided, a dedicated new EventTarget will be created. i.e., it can share the same emitter with other EventHubs (e.g., for a global event bus, or separately built apps via window object).
     */
    constructor(emitter) {
        /**
         * The event emitter used to dispatch and listen for events.
         *
         * @private
         */
        Object.defineProperty(this, "_emitter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_assigned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "_allAssigned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this._emitter = emitter ?? new EventTarget();
    }
    _issueSignal(key, callback, sourceSignal) {
        const controller = new AbortController();
        const controllerRef = new FallbackWeakRef(controller);
        const assigned = this._assigned.get(key) ?? new WeakMap();
        const callbackControllers = assigned.get(callback) ?? new Set();
        const allAssigned = this._allAssigned.get(key) ?? new Set();
        const abortFromSource = () => controller.abort();
        controller.signal.addEventListener("abort", () => {
            sourceSignal?.removeEventListener("abort", abortFromSource);
            callbackControllers.delete(controllerRef);
            if (callbackControllers.size === 0) {
                assigned.delete(callback);
            }
            allAssigned.delete(controllerRef);
            if (allAssigned.size === 0) {
                this._assigned.delete(key);
                this._allAssigned.delete(key);
            }
        }, { once: true });
        callbackControllers.add(controllerRef);
        assigned.set(callback, callbackControllers);
        this._assigned.set(key, assigned);
        allAssigned.add(controllerRef);
        this._allAssigned.set(key, allAssigned);
        if (sourceSignal) {
            sourceSignal.addEventListener("abort", abortFromSource, { once: true });
            if (sourceSignal.aborted) {
                controller.abort();
            }
        }
        return controller;
    }
    _listen(key, callback, listener, options) {
        const controller = this._issueSignal(key, callback, options?.signal);
        const controlledListener = options?.once
            ? (event) => {
                try {
                    listener(event);
                }
                finally {
                    controller.abort();
                }
            }
            : listener;
        this._emitter.addEventListener(key, controlledListener, { ...options, signal: controller.signal });
        return controller;
    }
    emitEvent(event, data) {
        this._emitter.dispatchEvent(new CustomEvent(`${event.toString()}`, { detail: data ?? undefined }));
    }
    on(event, callback, options) {
        const onEvent = (e) => void callback(e, e instanceof CustomEvent ? e?.detail : undefined);
        const key = event;
        const controller = this._listen(key, callback, onEvent, options);
        return () => controller.abort();
    }
    /**
     * Removes current event registrations in bulk.
     *
     * Prefer the disposer returned by `on`, `onEvent`, `once`, or `onceEvent` when removing one registration.
     *
     * @param event - The event whose registrations should be removed.
     * @param callback - The callback whose registrations should be removed. Omit it to remove every registration for the event.
     */
    off(event, callback) {
        const key = event;
        if (callback) {
            const controllers = this._assigned.get(key)?.get(callback);
            controllers?.forEach((controllerRef) => controllerRef.deref()?.abort());
        }
        else {
            this._allAssigned.get(key)?.forEach((controllerRef) => {
                const controller = controllerRef.deref();
                controller?.abort();
            });
        }
    }
    /**
     * Removes all event listeners.
     */
    offAll() {
        for (const [key] of this._allAssigned) {
            this.off(key);
        }
    }
    onEvent(event, callback, options) {
        const onEvent = (e) => void callback(e instanceof CustomEvent ? e?.detail : undefined);
        const key = event;
        const controller = this._listen(key, callback, onEvent, options);
        return () => controller.abort();
    }
    once(event, callback, options) {
        return this.on(event, callback, { ...options, once: true });
    }
    onceEvent(event, callback, options) {
        return this.on(event, (_, data) => callback(data), { ...options, once: true });
    }
    waitFor(event) {
        return new Promise((resolve) => {
            this.onceEvent(event, (data) => {
                resolve(data);
            });
        });
    }
}

export { EventHub };
//# sourceMappingURL=EventHub.js.map
