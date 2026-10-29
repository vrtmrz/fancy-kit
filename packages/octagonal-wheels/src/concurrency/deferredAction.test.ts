import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeferredAction, type TimeoutScheduler } from "./deferredAction.ts";

function createScheduler() {
    const events: string[] = [];
    const entries: { callback: () => void; delayMs: number; cancel: ReturnType<typeof vi.fn> }[] = [];
    const schedule = vi.fn<TimeoutScheduler>((callback, delayMs) => {
        const index = entries.length;
        events.push("schedule:" + delayMs);
        const cancel = vi.fn(() => events.push("cancel:" + index));
        entries.push({ callback, delayMs, cancel });
        return cancel;
    });
    return { schedule, entries, events };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("createDeferredAction", () => {
    it("creates an idle controller without calling the scheduler", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const controller = createDeferredAction(callback, scheduler.schedule);

        controller.cancel();
        controller.dispose();
        controller.dispose();
        expect(scheduler.schedule).not.toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
    });

    it("runs a scheduled callback once and leaves no cancellation work after expiry", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(42);

        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(scheduler.entries[0].delayMs).toBe(42);
        expect(callback).not.toHaveBeenCalled();
        scheduler.entries[0].callback();
        scheduler.entries[0].callback();
        controller.cancel();
        controller.dispose();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(scheduler.entries[0].cancel).not.toHaveBeenCalled();
    });

    it("cancels the old registration before replacing it and suppresses stale callbacks", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(10);
        controller.schedule(20);

        expect(scheduler.events).toEqual(["schedule:10", "cancel:0", "schedule:20"]);
        scheduler.entries[0].callback();
        expect(callback).not.toHaveBeenCalled();
        scheduler.entries[1].callback();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("allows scheduling after cancellation and only cancels each registration once", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(10);
        controller.cancel();
        controller.cancel();
        scheduler.entries[0].callback();
        expect(callback).not.toHaveBeenCalled();
        expect(scheduler.entries[0].cancel).toHaveBeenCalledTimes(1);

        controller.schedule(20);
        scheduler.entries[1].callback();
        expect(callback).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it("makes disposal terminal and idempotent", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(10);
        controller.dispose();
        controller.dispose();
        controller.cancel();
        controller.schedule(20);
        scheduler.entries[0].callback();

        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(scheduler.entries[0].cancel).toHaveBeenCalledTimes(1);
        expect(callback).not.toHaveBeenCalled();
    });

    it("keeps controller instances independent even when they share a scheduler", () => {
        const scheduler = createScheduler();
        const firstCallback = vi.fn();
        const secondCallback = vi.fn();
        const first = createDeferredAction(firstCallback, scheduler.schedule);
        const second = createDeferredAction(secondCallback, scheduler.schedule);
        first.schedule(10);
        second.schedule(10);
        first.dispose();
        scheduler.entries[0].callback();
        scheduler.entries[1].callback();

        expect(firstCallback).not.toHaveBeenCalled();
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(scheduler.entries[1].cancel).not.toHaveBeenCalled();
        second.dispose();
    });

    it("releases the expired registration before a callback schedules its next timeout", () => {
        const scheduler = createScheduler();
        const controller = createDeferredAction(() => controller.schedule(20), scheduler.schedule);
        controller.schedule(10);
        scheduler.entries[0].callback();

        expect(scheduler.events).toEqual(["schedule:10", "schedule:20"]);
        controller.cancel();
        expect(scheduler.entries[0].cancel).not.toHaveBeenCalled();
        expect(scheduler.entries[1].cancel).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it("propagates callback failures without retaining a pending registration", () => {
        const scheduler = createScheduler();
        const error = new Error("Callback failed");
        const controller = createDeferredAction(() => {
            throw error;
        }, scheduler.schedule);
        controller.schedule(10);

        expect(() => scheduler.entries[0].callback()).toThrow(error);
        controller.cancel();
        expect(scheduler.entries[0].cancel).not.toHaveBeenCalled();
        controller.schedule(20);
        expect(scheduler.schedule).toHaveBeenCalledTimes(2);
        controller.dispose();
    });

    it("propagates scheduling failures and leaves their callbacks inactive", () => {
        const callback = vi.fn();
        const error = new Error("Scheduling failed");
        let failedCallback: (() => void) | undefined;
        const scheduler = createScheduler();
        const schedule = vi
            .fn<TimeoutScheduler>()
            .mockImplementationOnce((next) => {
                failedCallback = next;
                throw error;
            })
            .mockImplementation(scheduler.schedule);
        const controller = createDeferredAction(callback, schedule);

        expect(() => controller.schedule(10)).toThrow(error);
        failedCallback?.();
        controller.cancel();
        expect(callback).not.toHaveBeenCalled();
        controller.schedule(20);
        scheduler.entries[0].callback();
        expect(callback).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it("keeps a cancelled callback inactive when its cancellation function fails", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const error = new Error("Cancellation failed");
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(10);
        scheduler.entries[0].cancel.mockImplementation(() => {
            throw error;
        });

        expect(() => controller.cancel()).toThrow(error);
        scheduler.entries[0].callback();
        controller.cancel();
        expect(callback).not.toHaveBeenCalled();
        expect(scheduler.entries[0].cancel).toHaveBeenCalledTimes(1);
        controller.schedule(20);
        scheduler.entries[1].callback();
        expect(callback).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it("does not schedule a replacement if cancelling the previous registration fails", () => {
        const scheduler = createScheduler();
        const error = new Error("Cancellation failed");
        const controller = createDeferredAction(vi.fn(), scheduler.schedule);
        controller.schedule(10);
        scheduler.entries[0].cancel.mockImplementation(() => {
            throw error;
        });

        expect(() => controller.schedule(20)).toThrow(error);
        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it("remains disposed when releasing its timer fails", () => {
        const scheduler = createScheduler();
        const callback = vi.fn();
        const error = new Error("Cancellation failed");
        const controller = createDeferredAction(callback, scheduler.schedule);
        controller.schedule(10);
        scheduler.entries[0].cancel.mockImplementation(() => {
            throw error;
        });

        expect(() => controller.dispose()).toThrow(error);
        controller.dispose();
        controller.schedule(20);
        scheduler.entries[0].callback();
        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(scheduler.entries[0].cancel).toHaveBeenCalledTimes(1);
        expect(callback).not.toHaveBeenCalled();
    });

    it("releases a registration when the scheduler disposes its owner before returning", () => {
        const callback = vi.fn();
        const cancel = vi.fn();
        let scheduledCallback: (() => void) | undefined;
        const schedule = vi.fn<TimeoutScheduler>((next) => {
            scheduledCallback = next;
            controller.dispose();
            return cancel;
        });
        const controller = createDeferredAction(callback, schedule);
        controller.schedule(10);
        controller.schedule(20);
        scheduledCallback?.();

        expect(cancel).toHaveBeenCalledTimes(1);
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(callback).not.toHaveBeenCalled();
    });

    it("preserves a replacement registration when the earlier scheduling call fails", () => {
        const callback = vi.fn();
        const error = new Error("Earlier registration failed");
        const scheduler = createScheduler();
        const schedule = vi
            .fn<TimeoutScheduler>()
            .mockImplementationOnce(() => {
                controller.schedule(20);
                throw error;
            })
            .mockImplementation(scheduler.schedule);
        const controller = createDeferredAction(callback, schedule);

        expect(() => controller.schedule(10)).toThrow(error);
        scheduler.entries[0].callback();
        expect(callback).toHaveBeenCalledTimes(1);
        controller.dispose();
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("passes delay %s unchanged to the scheduler", (delay) => {
        const scheduler = createScheduler();
        const controller = createDeferredAction(vi.fn(), scheduler.schedule);
        controller.schedule(delay);
        expect(scheduler.entries[0].delayMs).toBe(delay);
        controller.dispose();
    });

    it("uses global timers lazily and clears a zero-valued handle with its receiver", () => {
        const callback = vi.fn();
        const setTimer = vi.spyOn(window as Window, "setTimeout").mockReturnValue(0);
        const clearTimer = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => {});
        const controller = createDeferredAction(callback);
        expect(setTimer).not.toHaveBeenCalled();
        controller.schedule(25);
        expect(setTimer).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 25);
        expect(setTimer.mock.contexts[0]).toBe(globalThis);
        controller.cancel();
        expect(clearTimer).toHaveBeenCalledExactlyOnceWith(0);
        expect(clearTimer.mock.contexts[0]).toBe(globalThis);
        controller.dispose();
    });

    it("preserves asynchronous zero-delay execution with native timer semantics", () => {
        vi.useFakeTimers();
        const callback = vi.fn();
        const controller = createDeferredAction(callback);
        controller.schedule(0);
        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(0);
        expect(callback).toHaveBeenCalledTimes(1);
        controller.dispose();
        expect(vi.getTimerCount()).toBe(0);
    });
});
