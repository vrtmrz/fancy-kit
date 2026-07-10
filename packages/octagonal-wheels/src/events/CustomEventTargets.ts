/**
 * LinkedEventTarget is an EventTarget that can link to upstream and downstream EventTargets.
 * It will first try to dispatch the event upstream, and if that fails, it will dispatch it to itself.
 * If the event is not handled by itself or upstream, it will then dispatch it downstream.
 * If the event is not handled by any of the targets, it will return false.
 * Note: events should be cancelable for this to work properly.
 * If the event is not cancelable, it will always return true.
 */
export class InterceptiveEventTarget extends EventTarget {
    _onBeforeDispatch?: (event: Event) => boolean;
    _onAfterDispatch?: (event: Event) => boolean;

    constructor(onBeforeDispatch?: (event: Event) => boolean, onAfterDispatch?: (event: Event) => boolean) {
        super();
        this._onBeforeDispatch = onBeforeDispatch;
        this._onAfterDispatch = onAfterDispatch;
    }

    override dispatchEvent(event: Event): boolean {
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

export class LinkedEventTarget extends InterceptiveEventTarget {
    constructor(upstream?: EventTarget, downstream?: EventTarget) {
        super(
            upstream ? upstream.dispatchEvent.bind(upstream) : undefined,
            downstream ? downstream.dispatchEvent.bind(downstream) : undefined
        );
    }
}
const WrappedEventName = "wrappedEvent.event.globalChannel";
type WrappedEventDetail = {
    originalEvent: Event;
};
class WrappedEvent extends CustomEvent<WrappedEventDetail> {
    constructor(event: Event) {
        super(WrappedEventName, { detail: { originalEvent: event } });
    }
}
export class GlobalChannelTarget extends InterceptiveEventTarget {
    constructor() {
        super();
        globalThis.addEventListener(
            WrappedEventName,
            (event) => {
                this.dispatchEvent(event);
            },
            { once: true }
        );
        this._onAfterDispatch = (event: Event) => {
            if (event instanceof WrappedEvent) {
                super.dispatchEvent(event.detail.originalEvent);
            } else {
                globalThis.dispatchEvent(new WrappedEvent(event));
            }
            return true; // Allow the event to bubble up
        };
    }
}
