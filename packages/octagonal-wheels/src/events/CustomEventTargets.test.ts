import { describe, it, expect, vi } from "vitest";
import { LinkedEventTarget } from "./CustomEventTargets.ts";

function handle(event: Event) {
    // This is a placeholder function to simulate event handling
    event.preventDefault();
    event.stopPropagation();
    return true;
}
describe("LinkedEventTarget", () => {
    it("should return false if event is not handled", () => {
        const target = new LinkedEventTarget();
        // const handler = vi.fn(handle);
        // target.addEventListener('foo', handler);

        const event = new Event("foo", { cancelable: true });
        const result = target.dispatchEvent(event);

        expect(result).toBe(true);
        // expect(handler).toHaveBeenCalled();
    });
    it("should dispatch event to itself if no upstream or downstream", () => {
        const target = new LinkedEventTarget();
        const handler = vi.fn(handle);
        target.addEventListener("foo", handler);

        const event = new Event("foo", { cancelable: true });
        const result = target.dispatchEvent(event);

        expect(result).toBe(false);
        expect(handler).toHaveBeenCalled();
    });

    it("should dispatch event to upstream if present", () => {
        const upstream = new EventTarget();
        const handler = vi.fn(handle);
        upstream.addEventListener("foo", handler);

        const target = new LinkedEventTarget(upstream);
        const event = new Event("foo", { cancelable: true });
        const result = target.dispatchEvent(event);

        expect(result).toBe(false);
        expect(handler).toHaveBeenCalled();
    });

    it("should dispatch event to downstream if not handled by itself or upstream", () => {
        const downstream = new EventTarget();
        const handler = vi.fn(handle);
        downstream.addEventListener("foo", handler);

        // upstream keep innocent with the event, so event should go to downstream
        const upstream = new EventTarget();

        const target = new LinkedEventTarget(upstream, downstream);
        const event = new Event("foo", { cancelable: true });
        const result = target.dispatchEvent(event);

        expect(result).toBe(false);
        expect(handler).toHaveBeenCalled();
    });

    it("should not dispatch to downstream if handled by upstream", () => {
        const downstream = new EventTarget();
        const handler = vi.fn(handle);
        downstream.addEventListener("foo", handler);
        const upstreamHandler = vi.fn(handle);
        // upstream returns true, so event should not go to downstream
        const upstream = new EventTarget();
        upstream.addEventListener("foo", upstreamHandler);
        const target = new LinkedEventTarget(upstream, downstream);
        const event = new Event("foo", { cancelable: true });
        const result = target.dispatchEvent(event);

        expect(result).toBe(false);
        expect(handler).not.toHaveBeenCalled();
        expect(upstreamHandler).toHaveBeenCalled();
    });
});
