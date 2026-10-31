import { describe, expect, it, vi } from "vitest";
import { createNotifier } from "./notifier.ts";
import { createCoalescingNotifier, type CoalescingNotifier } from "./coalescingNotifier.ts";
import type { TimeoutScheduler } from "./deferredAction.ts";

function scheduler() {
    const registrations: { callback: () => void; delay: number; cancel: ReturnType<typeof vi.fn> }[] = [];
    const schedule: TimeoutScheduler = (callback, delay) => {
        const registration = { callback, delay, cancel: vi.fn() };
        registrations.push(registration);
        return registration.cancel;
    };
    return { schedule, registrations };
}

describe("createCoalescingNotifier", () => {
    it("preserves first-and-every-N notification when leading is enabled", () => {
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier<number>({ everyCount: 100, leading: true, onNotify });
        for (let count = 1; count <= 202; count++) notifier.update(count);
        expect(onNotify.mock.calls).toEqual([[1], [101], [201]]);
        notifier.flush();
        notifier.flush();
        expect(onNotify.mock.calls).toEqual([[1], [101], [201], [202]]);
    });

    it("uses real progress increases rather than update frequency", () => {
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier<{ count: number; bytes: number }>({
            everyCount: 25,
            getCount: (value) => value.count,
            onNotify,
        });
        for (let bytes = 0; bytes < 100; bytes++) notifier.update({ count: 1, bytes });
        expect(onNotify).not.toHaveBeenCalled();
        notifier.update({ count: 25, bytes: 100 });
        notifier.update({ count: 49, bytes: 110 });
        notifier.update({ count: 51, bytes: 120 });
        expect(onNotify.mock.calls).toEqual([[{ count: 25, bytes: 100 }], [{ count: 51, bytes: 120 }]]);
    });

    it("delivers the latest value at the original waiting deadline even without further input", () => {
        const clock = scheduler();
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier<string>({
            maxWaitMs: 2000,
            onNotify,
            scheduleTimeout: clock.schedule,
        });
        expect(clock.registrations).toHaveLength(0);
        notifier.update("first");
        notifier.update("last");
        expect(clock.registrations).toHaveLength(1);
        expect(clock.registrations[0].delay).toBe(2000);
        clock.registrations[0].callback();
        expect(onNotify).toHaveBeenCalledExactlyOnceWith("last");
        notifier.flush();
        expect(onNotify).toHaveBeenCalledTimes(1);
        expect(clock.registrations).toHaveLength(1);
    });

    it("cancels the waiting notification when count wins and ignores a stale timer callback", () => {
        const clock = scheduler();
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier<number>({
            everyCount: 2,
            maxWaitMs: 10,
            onNotify,
            scheduleTimeout: clock.schedule,
        });
        notifier.update(1);
        notifier.update(2);
        expect(onNotify).toHaveBeenCalledExactlyOnceWith(2);
        expect(clock.registrations[0].cancel).toHaveBeenCalledOnce();
        clock.registrations[0].callback();
        notifier.update(3);
        clock.registrations[1].callback();
        expect(onNotify.mock.calls).toEqual([[2], [3]]);
    });

    it("flushes only pending updates and restarts both limits afterwards", () => {
        const clock = scheduler();
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier<number>({
            everyCount: 3,
            maxWaitMs: 10,
            onNotify,
            scheduleTimeout: clock.schedule,
        });
        notifier.flush();
        notifier.update(1);
        notifier.flush();
        notifier.update(2);
        notifier.update(3);
        expect(onNotify.mock.calls).toEqual([[1]]);
        notifier.update(4);
        expect(onNotify.mock.calls).toEqual([[1], [4]]);
    });

    it("keeps independent instances and treats disposal as terminal", () => {
        const clock = scheduler();
        const firstNotify = vi.fn();
        const secondNotify = vi.fn();
        const first = createCoalescingNotifier<number>({
            maxWaitMs: 0,
            onNotify: firstNotify,
            scheduleTimeout: clock.schedule,
        });
        const second = createCoalescingNotifier<number>({
            maxWaitMs: 0,
            onNotify: secondNotify,
            scheduleTimeout: clock.schedule,
        });
        first.update(1);
        second.update(2);
        first.dispose();
        first.dispose();
        first.update(3);
        first.flush();
        for (const registration of clock.registrations) registration.callback();
        expect(firstNotify).not.toHaveBeenCalled();
        expect(secondNotify).toHaveBeenCalledExactlyOnceWith(2);
        expect(clock.registrations[0].cancel).toHaveBeenCalledOnce();
    });

    it("can wake a wait group from a coalesced callback", async () => {
        const signal = createNotifier();
        const progress = createCoalescingNotifier({ everyCount: 2, onNotify: signal.notify });
        let resolved = false;
        const waiting = signal.wait().then(() => {
            resolved = true;
        });

        progress.update(1);
        await Promise.resolve();
        expect(resolved).toBe(false);
        progress.update(2);
        await waiting;
        expect(resolved).toBe(true);

        const nextWaiting = signal.wait();
        progress.update(3);
        progress.update(4);
        await nextWaiting;
    });

    it("preserves a reentrant update for the next notification", () => {
        const clock = scheduler();
        let notifier!: CoalescingNotifier<number>;
        const onNotify = vi.fn((value: number) => {
            if (value === 1) notifier.update(2);
        });
        notifier = createCoalescingNotifier({ maxWaitMs: 10, onNotify, scheduleTimeout: clock.schedule });
        notifier.update(1);
        clock.registrations[0].callback();
        expect(onNotify.mock.calls).toEqual([[1]]);
        clock.registrations[1].callback();
        expect(onNotify.mock.calls).toEqual([[1], [2]]);
    });

    it("propagates callback errors without retrying the delivered update", () => {
        const error = new Error("notification failed");
        const onNotify = vi.fn(() => {
            throw error;
        });
        const notifier = createCoalescingNotifier({ everyCount: 1, onNotify });
        expect(() => notifier.update(undefined)).toThrow(error);
        notifier.flush();
        expect(onNotify).toHaveBeenCalledOnce();
    });

    it("retains the pending value after a scheduler failure for explicit flush", () => {
        const error = new Error("schedule failed");
        const onNotify = vi.fn();
        const notifier = createCoalescingNotifier({
            maxWaitMs: 10,
            onNotify,
            scheduleTimeout: () => {
                throw error;
            },
        });
        expect(() => notifier.update(1)).toThrow(error);
        notifier.flush();
        expect(onNotify).toHaveBeenCalledExactlyOnceWith(1);
    });

    it("rejects missing or invalid limits before scheduling", () => {
        const onNotify = vi.fn();
        expect(() => createCoalescingNotifier({ onNotify })).toThrow(TypeError);
        for (const everyCount of [0, -1, 1.5, Infinity, NaN]) {
            expect(() => createCoalescingNotifier({ onNotify, everyCount })).toThrow(RangeError);
        }
        for (const maxWaitMs of [-1, Infinity, NaN]) {
            expect(() => createCoalescingNotifier({ onNotify, maxWaitMs })).toThrow(RangeError);
        }
    });
});
