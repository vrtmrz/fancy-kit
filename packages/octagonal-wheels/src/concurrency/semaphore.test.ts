//OK

import { describe, beforeEach, it, expect } from "vitest";
import { Semaphore, type SemaphoreObject } from "./semaphore.ts";
import { delay } from "../promises.ts";

class Runner {
    maxConcurrency = 0;
    currentConcurrency = 0;
    _process: () => Promise<void>;
    constructor(process: () => Promise<void>) {
        this._process = process;
    }
    async process() {
        try {
            this.currentConcurrency++;
            if (this.currentConcurrency > this.maxConcurrency) {
                this.maxConcurrency = this.currentConcurrency;
            }
            await this._process();
        } finally {
            this.currentConcurrency--;
        }
    }
}
describe("Semaphore", () => {
    let semaphore: SemaphoreObject;
    let runner: Runner;
    let process: () => Promise<void>;

    beforeEach(() => {
        semaphore = Semaphore(3);
        runner = new Runner(async () => {
            await delay(100);
        });
        process = async () => {
            const release = await semaphore.acquire();
            try {
                await runner.process();
            } finally {
                release();
            }
        };
    });

    it("immediately reserves an available permit through tryAcquire and holds queued work until release", async () => {
        const single = Semaphore(1);
        const release = await single.tryAcquire(1, 0);
        expect(release).not.toBe(false);
        if (release === false) throw new Error("Expected an available permit.");

        let acquired = false;
        const queued = single.acquire().then((releaseQueued) => {
            acquired = true;
            return releaseQueued;
        });
        await Promise.resolve();
        expect(single.waiting).toBe(1);
        expect(acquired).toBe(false);

        release();
        const releaseQueued = await queued;
        expect(acquired).toBe(true);
        expect(single.waiting).toBe(0);
        releaseQueued();
    });

    it("ignores an extra release while idle without creating an additional permit", async () => {
        const single = Semaphore(1);
        const release = await single.acquire();
        release();
        release();

        const releaseNext = await single.acquire();
        let acquired = false;
        const queued = single.acquire().then((releaseQueued) => {
            acquired = true;
            return releaseQueued;
        });
        await Promise.resolve();
        expect(acquired).toBe(false);
        expect(single.waiting).toBe(1);

        releaseNext();
        const releaseQueued = await queued;
        expect(acquired).toBe(true);
        expect(single.waiting).toBe(0);
        releaseQueued();
    });

    it("should acquire and release semaphore", async () => {
        const releaser = await semaphore.acquire();
        expect(releaser).to.be.a("function");
        releaser();
        expect(semaphore.waiting).to.equal(0);
    });

    it("should concurrency kept in limit", async () => {
        const processes = Array.from({ length: 10 }, () => process());
        expect(semaphore.waiting).to.equal(7);
        await Promise.all(processes);
        expect(runner.maxConcurrency).to.equal(3);
        expect(semaphore.waiting).to.equal(0);
    });

    it("should limit the number of acquired semaphores", async () => {
        const releaser1 = await semaphore.acquire();
        const releaser2 = await semaphore.acquire();
        const releaser3 = await semaphore.acquire();
        const releaser4 = await semaphore.tryAcquire();
        expect(releaser4).to.equal(false);
        releaser3();
        const releaser5 = await semaphore.tryAcquire();
        expect(releaser5).to.be.a("function");
        //@ts-ignore
        releaser5();
        releaser2();
        releaser1();
    });
    it("should timeout if not acquired in time", async () => {
        const l = await Promise.all(Array.from({ length: 3 }, () => semaphore.acquire()));
        const now = Date.now();
        const releaser = await semaphore.tryAcquire(1, 100);
        const elapsed = Date.now() - now;
        expect(elapsed).to.be.greaterThanOrEqual(100);
        expect(elapsed).to.be.lessThan(200);
        expect(releaser).to.equal(false);
        l.forEach((r) => r());
    });
});
