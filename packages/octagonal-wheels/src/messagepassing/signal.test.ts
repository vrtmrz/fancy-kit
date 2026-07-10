import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RESULT_TIMED_OUT } from "../common/const.ts";
import { sendSignal, sendValue, waitForSignal, waitForValue } from "./signal.ts";

describe("waitForSignal", () => {
    beforeEach(() => {
        vi.clearAllTimers();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("should resolve with true when signal is received", async () => {
        const id = "testSignal";
        const timeout = 1000;
        const promise = waitForSignal(id, timeout);
        sendSignal(id);
        const result = await promise;
        expect(result).toBe(true);
    });

    it("should resolve with RESULT_TIMED_OUT when timeout is reached", async () => {
        const id = "testSignal";
        const timeout = 1000;
        const promise = waitForSignal(id, timeout);
        vi.advanceTimersByTime(timeout + 100);
        const result = await promise;
        expect(result).toBe(false);
    });
});
describe("waitForValue", () => {
    beforeEach(() => {
        vi.clearAllTimers();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("should resolve with the value when signal is received", async () => {
        const id = "testSignal";
        const timeout = 1000;
        const value = "testValue";
        const promise = waitForValue<string>(id, timeout);
        sendValue(id, value);
        const result = await promise;
        vi.advanceTimersByTime(timeout + 100);
        expect(result).toBe(value);
    });

    it("should resolve with RESULT_TIMED_OUT when timeout is reached", async () => {
        const id = "testSignal";
        const timeout = 1000;
        const promise = waitForValue<string>(id, timeout);
        vi.advanceTimersByTime(timeout + 100);
        const result = await promise;
        expect(result).toBe(RESULT_TIMED_OUT);
    });
});
