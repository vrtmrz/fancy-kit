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
    _issueSignal(key, callback) {
        let assigned = this._assigned.get(key);
        if (assigned === undefined) {
            assigned = new WeakMap();
        }
        const controllerRef = assigned.get(callback);
        let controller = controllerRef?.deref();
        if (!controller || controller.signal.aborted) {
            controller = new AbortController();
            const refController = new FallbackWeakRef(controller);
            controller.signal.addEventListener("abort", () => {
                this._assigned.get(key)?.delete(callback);
                this._allAssigned.get(key)?.delete(refController);
            }, { once: true });
            assigned.set(callback, refController);
            this._assigned.set(key, assigned);
            const allAssigned = this._allAssigned.get(key) ?? new Set();
            allAssigned.add(refController);
            this._allAssigned.set(key, allAssigned);
            return controller;
        }
        return controller;
    }
    emitEvent(event, data) {
        this._emitter.dispatchEvent(new CustomEvent(`${event.toString()}`, { detail: data ?? undefined }));
    }
    on(event, callback, options) {
        const onEvent = (e) => void callback(e, e instanceof CustomEvent ? e?.detail : undefined);
        const key = event;
        const controller = this._issueSignal(key, callback);
        this._emitter.addEventListener(key, onEvent, { ...options, signal: controller.signal });
        return () => this.off(event, callback);
    }
    /**
     * Removes an event listener for a specific event.
     * @param event
     * @param callback
     */
    off(event, callback) {
        const key = event;
        if (callback) {
            const w = this._assigned.get(key)?.get(callback);
            const controller = w?.deref();
            controller?.abort();
        }
        else {
            this._allAssigned.get(key)?.forEach((w) => {
                const controller = w.deref();
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
        const controller = this._issueSignal(key, callback);
        this._emitter.addEventListener(key, onEvent, { ...options, signal: controller.signal });
        return () => this.off(event, callback);
    }
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }
    onceEvent(event, callback) {
        return this.on(event, (_, data) => callback(data), { once: true });
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
