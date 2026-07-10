// OK
import { describe, beforeEach, vi, afterEach, test, expect } from "vitest";
import {
    scheduleTask,
    cancelTask,
    isWaitingForTimeout,
    waitForTimeout,
    finishWaitingForTimeout,
    finishAllWaitingForTimeout,
    cancelAllTasks,
    pipeArrayToGenerator,
    pipeGeneratorToGenerator,
    unwrapTaskResult,
    processAllTasksWithConcurrencyLimit,
    mapAllTasksWithConcurrencyLimit,
} from "./task.ts";

class Runner {
    maxConcurrency = 0;
    currentConcurrency = 0;

    async run<T>(process: () => T, delayTime = 0, suspendTime = 0) {
        try {
            this.currentConcurrency++;
            if (this.currentConcurrency > this.maxConcurrency) {
                this.maxConcurrency = this.currentConcurrency;
            }
            if (delayTime) await delay(delayTime);
            const ret = await process();
            if (suspendTime) await delay(suspendTime);
            return ret;
        } finally {
            this.currentConcurrency--;
        }
    }
}

describe("scheduleTask", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test("should schedule a task and execute it after the specified timeout", () => {
        const key = "task1";
        const timeout = 1000;
        const proc = vi.fn();

        scheduleTask(key, timeout, proc);

        expect(proc).not.toBeCalled();

        vi.advanceTimersByTime(timeout);

        expect(proc).toBeCalled();
    });

    test("should not execute the task if it is canceled before the timeout", () => {
        const key = "task2";
        const timeout = 1000;
        const proc = vi.fn();

        scheduleTask(key, timeout, proc);
        cancelTask(key);

        vi.advanceTimersByTime(timeout);

        expect(proc).not.toBeCalled();
    });
    test("should not execute multiple tasks if they are canceled before the timeout", () => {
        const key = "task2";
        const timeout = 1000;
        const proc = vi.fn();

        scheduleTask("A", timeout, proc);
        scheduleTask("B", timeout, proc);
        scheduleTask("C", timeout, proc);
        scheduleTask("D", timeout, proc);
        cancelAllTasks();

        vi.advanceTimersByTime(timeout);

        expect(proc).not.toBeCalled();
    });

    test("should skip scheduling the task if it already exists and skipIfTaskExist is true", () => {
        const key = "task3";
        const timeout = 1000;
        let v = 0;
        const proc = vi.fn((z) => (v = z));

        scheduleTask(key, timeout, () => proc(1), true);
        scheduleTask(key, timeout, () => proc(2), true); // This should be skipped

        vi.advanceTimersByTime(timeout);

        expect(proc).toBeCalledTimes(1);
        expect(v).toBe(1);
    });
    test("should skip scheduling the task if it already exists and skipIfTaskExist is false", () => {
        const key = "task3";
        const timeout = 1000;
        let v = 0;
        const proc = vi.fn((z) => (v = z));
        scheduleTask(key, timeout, () => proc(1)); // This should be canceled
        scheduleTask(key, timeout, () => proc(2));

        vi.advanceTimersByTime(timeout);

        expect(proc).toBeCalledTimes(1);
        expect(v).toBe(2);
    });
});

describe("waitForTimeout", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });
    test("should resolve after the specified timeout", async () => {
        const key = "test1";
        const timeout = 1000;

        const promise = waitForTimeout(key, timeout);
        vi.advanceTimersByTime(timeout);
        await expect(promise).resolves.toBeTruthy();
    });

    test("should reject if finishWaitingForTimeout is called before the timeout", async () => {
        const key = "test2";
        const timeout = 1000;

        const promise = waitForTimeout(key, timeout);
        finishWaitingForTimeout(key);

        await expect(promise).resolves.toBeFalsy();
    });

    test("should resolve for multiple keys with different timeouts", async () => {
        const key1 = "test3";
        const timeout1 = 1000;

        const key2 = "test4";
        const timeout2 = 2000;

        const promise1 = waitForTimeout(key1, timeout1);
        const promise2 = waitForTimeout(key2, timeout2);
        vi.advanceTimersByTime(timeout2);
        await expect(promise1).resolves.toBeTruthy();
        await expect(promise2).resolves.toBeTruthy();
    });
});

describe("finishWaitingForTimeout", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });
    test("should finish waiting for timeout", async () => {
        const key = "test1";
        const hasTimeout = true;
        const timeoutR = waitForTimeout(key, 1000);
        finishWaitingForTimeout(key, hasTimeout);

        await expect(timeoutR).resolves.toBe(true);
    });
    test("should finish waiting for timeout with false", async () => {
        const key = "test1";
        const hasTimeout = false;
        const timeoutR = waitForTimeout(key, 1000);
        finishWaitingForTimeout(key, hasTimeout);

        await expect(timeoutR).resolves.toBe(false);
    });
    test("should finish waiting for timeout with false", async () => {
        const key = "test1";
        const hasTimeout = false;
        const timeoutR = waitForTimeout(key, 1000);
        vi.advanceTimersByTime(1000);
        await expect(timeoutR).resolves.toBe(true);
    });
});

describe("finishAllWaitingForTimeout", () => {
    test("should finish waiting for timeout for all keys with the given prefix and return true", async () => {
        const prefix = "test-";
        const promise1 = waitForTimeout("test-", 1000);
        const promise2 = waitForTimeout("test-", 1000);
        const promise3 = waitForTimeout("xxxx-", 1000);

        finishAllWaitingForTimeout(prefix, true);
        await expect(promise1).resolves.toBeTruthy();
        await expect(promise2).resolves.toBeTruthy();
        finishAllWaitingForTimeout("xxxx-", false);
        await expect(promise3).resolves.toBeFalsy();
    });
});

test("isWaitingForTimeout should return true if the key is waiting for timeout", () => {
    const key = "test1";
    waitForTimeout(key, 1000);

    const result = isWaitingForTimeout(key);

    expect(result).toBe(true);
});

test("isWaitingForTimeout should return false if the key is not waiting for timeout", () => {
    const key = "test2";

    const result = isWaitingForTimeout(key);

    expect(result).toBe(false);
});

import { processAllGeneratorTasksWithConcurrencyLimit } from "./task.ts";
import { delay } from "../promises.ts";

describe("processAllGeneratorTasksWithConcurrencyLimit", () => {
    test("should process all tasks (Generator) with the given concurrency limit", async () => {
        let runner = new Runner();
        const numbers = [...new Array(100)].map((_, i) => i);
        const taskGen = pipeArrayToGenerator(numbers, async (i) => {
            return i;
        });
        const computedTask = pipeGeneratorToGenerator(taskGen, async (i) => {
            return runner.run(async () => {
                const awaited = await i();
                return awaited * 2;
            }, 25);
        });
        const process = processAllGeneratorTasksWithConcurrencyLimit(10, computedTask);
        let result = 0;
        for await (const r of process) {
            const rx = unwrapTaskResult(r);
            if (typeof rx === "number") {
                result += rx;
            }
        }
        expect(result).toBe(9900);
        expect(runner.maxConcurrency).toBe(10);
    });
});

describe("processAllTasksWithConcurrencyLimit", () => {
    test("should process all tasks (Array) with the given concurrency limit", async () => {
        let runner = new Runner();
        const numbers = [...new Array(100)].map((_, i) => i);
        const computedTask = numbers.map((i) => () => {
            const waitTime = Math.floor(Math.random() * 30);
            return runner.run(async () => {
                return i;
            }, waitTime);
        });

        const process = processAllTasksWithConcurrencyLimit(10, computedTask);
        let result = 0;
        for await (const r of process) {
            const rx = unwrapTaskResult(r);
            if (typeof rx === "number") {
                result += rx;
            }
        }
        expect(result).toBe(4950);
        expect(runner.maxConcurrency).toBe(10);
    });
});
describe("mapAllTasksWithConcurrencyLimit", () => {
    test("should process all tasks (Array) with the given concurrency limit", async () => {
        let runner = new Runner();
        const numbers = [...new Array(100)].map((_, i) => i);
        const computedTask = numbers.map((i) => () => {
            const waitTime = Math.floor(Math.random() * 30);
            return runner.run(() => {
                return i * 2;
            }, waitTime);
        });

        const wrappedResult = await mapAllTasksWithConcurrencyLimit(10, computedTask);
        const result = wrappedResult.map(unwrapTaskResult).filter((r): r is number => typeof r === "number");
        expect(runner.maxConcurrency).toBe(10);
        // Check Ordered
        expect(result).deep.equal(numbers.map((e) => e * 2));
    });
});

describe("tasks-etc", () => {
    test("et-cetra", async () => {
        let runner = new Runner();
        const numbers = [...new Array(100)].map((_, i) => i);
        const computedTask = numbers.map((i) => () => {
            const waitTime = Math.floor(Math.random() * 30);
            return runner.run(() => {
                if (i % 2 == 0) throw new Error("Even");
                return i * 2;
            }, waitTime);
        });

        const process = processAllTasksWithConcurrencyLimit(10, computedTask);
        let result = 0;
        for await (const r of process) {
            const rx = unwrapTaskResult(r);
            if (typeof rx === "number") {
                result += rx;
            }
        }
        expect(result).toBe(5000);
        expect(runner.maxConcurrency).toBe(10);
    });
});
