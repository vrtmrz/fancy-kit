import { describe, it, expect, beforeEach } from "vitest";

import { QueueProcessor } from "./processor.ts";
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

describe("QueueProcessor", () => {
    let runner: Runner;
    let runner2: Runner;

    beforeEach(() => {
        runner = new Runner(async () => {
            await delay(100);
        });
        runner2 = new Runner(async () => {
            await delay(300);
        });
    });
    it("should enqueue and process items", async () => {
        const processor = new QueueProcessor<number, number>(
            async (items) => {
                await runner.process();
                expect(items.length).toBeLessThanOrEqual(3);
            },
            {
                suspended: true,
                batchSize: 3,
                concurrentLimit: 2,
            }
        );

        for (let i = 0; i < 20; i++) {
            processor.enqueue(i);
        }
        await processor.waitForAllProcessed();
        expect(runner.maxConcurrency).to.equal(2);
        expect(processor.remaining).to.equal(0);
        expect(processor.totalRemaining).to.equal(0);
        expect(processor.nowProcessing).to.equal(0);
    });
    it("should enqueue and process items with pipe", async () => {
        const processor = new QueueProcessor<number, number>(
            async (items) => {
                await runner.process();
                expect(items.length).toBeLessThanOrEqual(3);
                return items;
            },
            {
                suspended: true,
                batchSize: 3,
                concurrentLimit: 2,
            }
        ).pipeTo(
            new QueueProcessor<number, number>(
                async (items) => {
                    await runner2.process();
                    expect(items.length).toBeLessThanOrEqual(5);
                    return items;
                },
                {
                    suspended: true,
                    batchSize: 5,
                    concurrentLimit: 3,
                }
            )
        );

        for (let i = 0; i < 20; i++) {
            processor.root.enqueue(i);
        }
        processor.resumePipeLine();
        await processor.root.waitForAllProcessed();
        expect(runner.maxConcurrency).to.equal(2);
        expect(runner2.maxConcurrency).to.equal(3);
        expect(processor.remaining).to.equal(0);
        expect(processor.totalRemaining).to.equal(0);
        expect(processor.nowProcessing).to.equal(0);
    });
    //TODO interval, etc..
});
