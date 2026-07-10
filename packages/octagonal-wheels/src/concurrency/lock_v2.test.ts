import { describe, it, expect } from "vitest";
import { ConcurrentTaskController, scheduleAndRunOnlyLatest, SCHEDULE_SKIPPED } from "./lock_v2";

describe("ConcurrentTaskController", () => {
    it("limits concurrency", async () => {
        const c = new ConcurrentTaskController(2);
        let running = 0;
        let maxRunning = 0;
        let maxRunningReported = 0;
        let maxRunningProgressReported = 0;
        let maxWaiting = 0;
        let reportCount = 0;
        let processed = 0;
        const task = async () => {
            processed++;
            running++;
            maxRunning = Math.max(maxRunning, running);
            maxRunningReported = Math.max(maxRunningReported, c.currentConcurrency);
            maxWaiting = Math.max(maxWaiting, c.currentPressure);
            await new Promise((r) => setTimeout(r, 10));
            running--;
        };
        function progressCallback() {
            reportCount++;
            maxRunningProgressReported = Math.max(c.currentConcurrency, maxRunningProgressReported);
            return Promise.resolve();
        }

        // const promises = Promise.all([c.run(task, progressCallback), c.run(task, progressCallback), c.run(task, progressCallback), c.run(task, progressCallback)]);
        // promises.then(() => {/* only fires */ })
        c.run(task, progressCallback);
        c.run(task, progressCallback);
        c.run(task); // no progress callback
        c.run(task, progressCallback);
        await c.waitForAllReleased();
        // await promises;
        expect(processed).toBe(4);
        expect(c.currentConcurrency).toBe(0);
        expect(c.currentPressure).toBe(0);
        expect(maxRunning).toBe(2);
        expect(maxWaiting).toBe(4);
        expect(maxRunningReported).toBe(2);
        expect(maxRunningProgressReported).toBe(2);
        expect(reportCount).toBe(6);
        // await promises; // ensure all tasks are done
    });
    it("can reporter throws an error", async () => {
        const c = new ConcurrentTaskController(1);
        c.run(
            async () => {
                await new Promise((r) => setTimeout(r, 10));
            },
            () => {
                throw new Error("reporter error");
            }
        );
        await c.waitForAllReleased();
        expect(c.currentConcurrency).toBe(0);
        // no unhandled promise rejection
    });
    it("can release twice", async () => {
        const c = new ConcurrentTaskController(1);
        const f = await c.__acquire();
        f();
        f();
        await c.waitForAllReleased();
        expect(c.currentConcurrency).toBe(0);
    });
});
describe("scheduleAndRunOnlyLatest", () => {
    it("aborts previous and runs only latest", async () => {
        let called: string[] = [];
        let count = 0;
        const proc = (ac?: AbortController) =>
            new Promise((resolve, reject) => {
                // if (ac?.signal.aborted) resolve(SCHEDULE_SKIPPED);
                setTimeout(() => {
                    // if (ac?.signal.aborted) resolve(SCHEDULE_SKIPPED)
                    // else {
                    called.push(`${count++}`);
                    resolve("done");
                    // }
                }, 100);
            });
        const p1 = scheduleAndRunOnlyLatest("g", "k", proc);
        await new Promise((r) => setTimeout(r, 1));
        const p2 = scheduleAndRunOnlyLatest("g", "k", proc);
        await new Promise((r) => setTimeout(r, 1));
        const p3 = scheduleAndRunOnlyLatest("g", "k", proc);
        await new Promise((r) => setTimeout(r, 1));
        const p4 = scheduleAndRunOnlyLatest("g", "x", proc);
        await new Promise((r) => setTimeout(r, 1));

        const r1 = await p1;
        const r2 = await p2;
        const r3 = await p3;
        const r4 = await p4;
        expect(r1).toBe("done");
        expect(r2).toBe(SCHEDULE_SKIPPED);
        expect(r3).toBe("done");
        expect(r4).toBe("done");
        // expect([r1]).toContain(SCHEDULE_SKIPPED);
        // expect([r1, r2]).toContain("done");
        expect(called).toEqual(["0", "1", "2"]);
    });
});
