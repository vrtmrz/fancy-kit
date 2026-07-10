/**
 * LinkedEventTarget is an EventTarget that can link to upstream and downstream EventTargets.
 * It will first try to dispatch the event upstream, and if that fails, it will dispatch it to itself.
 * If the event is not handled by itself or upstream, it will then dispatch it downstream.
 * If the event is not handled by any of the targets, it will return false.
 * Note: events should be cancelable for this to work properly.
 * If the event is not cancelable, it will always return true.
 */
export declare class InterceptiveEventTarget extends EventTarget {
    _onBeforeDispatch?: (event: Event) => boolean;
    _onAfterDispatch?: (event: Event) => boolean;
    constructor(onBeforeDispatch?: (event: Event) => boolean, onAfterDispatch?: (event: Event) => boolean);
    dispatchEvent(event: Event): boolean;
}
export declare class LinkedEventTarget extends InterceptiveEventTarget {
    constructor(upstream?: EventTarget, downstream?: EventTarget);
}
export declare class GlobalChannelTarget extends InterceptiveEventTarget {
    constructor();
}
