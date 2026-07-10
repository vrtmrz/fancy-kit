import { afterEach, beforeEach, describe, expect, test, vi, type Mock, type MockedFunction } from "vitest";
import { throttle } from "./function.ts";

describe("throttle function", () => {
    let mockFunction: MockedFunction<() => void>;
    let throttledFunction: ReturnType<typeof throttle>;

    beforeEach(() => {
        mockFunction = vi.fn();
        throttledFunction = throttle(mockFunction, 200);
        vi.clearAllTimers();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });
    vi.setConfig({ maxConcurrency: 1 });

    test("should call the original function immediately on the first invocation", async () => {
        throttledFunction();
        // await delay(500);
        await vi.advanceTimersByTimeAsync(500);
        expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    test("should call the original function only the first and the last within the specified timeout", async () => {
        throttledFunction();
        // await delay(10);
        await vi.advanceTimersByTimeAsync(10);
        throttledFunction();
        // await delay(10);]
        await vi.advanceTimersByTimeAsync(10);
        throttledFunction();
        // await delay(300);
        await vi.advanceTimersByTimeAsync(300);
        expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    test("should call the original function multiple times if the timeout has passed", async () => {
        throttledFunction();
        throttledFunction();
        throttledFunction();
        // await delay(500);
        await vi.advanceTimersByTimeAsync(500);
        throttledFunction();
        throttledFunction();
        throttledFunction();
        // await delay(500);
        await vi.advanceTimersByTimeAsync(500);
        expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    test("should pass the arguments to the original function", async () => {
        const arg1 = "arg1";
        const arg2 = 123;
        throttledFunction(arg1, arg2);
        expect(mockFunction).toHaveBeenCalledWith(arg1, arg2);
    });
});
