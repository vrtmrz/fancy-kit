/**
 * LinkedEventTarget is an EventTarget that can link to upstream and downstream EventTargets.
 * It will first try to dispatch the event upstream, and if that fails, it will dispatch it to itself.
 * If the event is not handled by itself or upstream, it will then dispatch it downstream.
 * If the event is not handled by any of the targets, it will return false.
 * Note: events should be cancelable for this to work properly.
 * If the event is not cancelable, it will always return true.
 */
class InterceptiveEventTarget extends EventTarget {
    constructor(onBeforeDispatch, onAfterDispatch) {
        super();
        Object.defineProperty(this, "_onBeforeDispatch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_onAfterDispatch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._onBeforeDispatch = onBeforeDispatch;
        this._onAfterDispatch = onAfterDispatch;
    }
    dispatchEvent(event) {
        if (!event.cancelable) {
            // If the event is not cancelable, we can just dispatch it and return true.
            return super.dispatchEvent(event);
        }
        if (this._onBeforeDispatch) {
            if (!this._onBeforeDispatch(event)) {
                // The event was successfully dispatched upstream, so we don't need to bubble it down.
                return false;
            }
        }
        const result = super.dispatchEvent(event);
        if (result) {
            // If the event was not dispatched successfully, we can try to dispatch it downstream.
            if (this._onAfterDispatch) {
                return this._onAfterDispatch(event);
            }
        }
        return result;
    }
}
class LinkedEventTarget extends InterceptiveEventTarget {
    constructor(upstream, downstream) {
        super(upstream ? upstream.dispatchEvent.bind(upstream) : undefined, downstream ? downstream.dispatchEvent.bind(downstream) : undefined);
    }
}
const WrappedEventName = "wrappedEvent.event.globalChannel";
class WrappedEvent extends CustomEvent {
    constructor(event) {
        super(WrappedEventName, { detail: { originalEvent: event } });
    }
}
class GlobalChannelTarget extends InterceptiveEventTarget {
    constructor() {
        super();
        globalThis.addEventListener(WrappedEventName, (event) => {
            this.dispatchEvent(event);
        }, { once: true });
        this._onAfterDispatch = (event) => {
            if (event instanceof WrappedEvent) {
                super.dispatchEvent(event.detail.originalEvent);
            }
            else {
                globalThis.dispatchEvent(new WrappedEvent(event));
            }
            return true; // Allow the event to bubble up
        };
    }
}

export { GlobalChannelTarget, InterceptiveEventTarget, LinkedEventTarget };
//# sourceMappingURL=CustomEventTargets.js.map
