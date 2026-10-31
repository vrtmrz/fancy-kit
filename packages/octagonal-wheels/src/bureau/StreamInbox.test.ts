import { describe, expect, it } from "vitest";

import { createStreamInbox, StreamInbox } from "./StreamInbox.ts";

async function releaseReader<T>(reader: ReadableStreamDefaultReader<T>): Promise<void> {
    try {
        await reader.cancel();
    } catch {
        // An errored stream rejects cancellation, but its reader lock can still be released.
    }
    reader.releaseLock();
}

describe("StreamInbox", () => {
    it("drains accepted items on close and rejects later posts", async () => {
        const inbox = createStreamInbox<number>({ capacity: 4 });
        const reader = inbox.readable.getReader();

        try {
            expect(inbox.post(1)).toBe(true);
            expect(inbox.post(2)).toBe(true);
            inbox.close();
            inbox.close();
            inbox.error(new Error("close already won"));

            expect(inbox.isClosed).toBe(true);
            expect(inbox.post(3)).toBe(false);
            expect(await reader.read()).toEqual({ done: false, value: 1 });
            expect(await reader.read()).toEqual({ done: false, value: 2 });
            expect(await reader.read()).toEqual({ done: true, value: undefined });
        } finally {
            await releaseReader(reader);
        }
    });

    it("unblocks a pending read when closed", async () => {
        const inbox = new StreamInbox<number>();
        const reader = inbox.readable.getReader();

        try {
            const pendingRead = reader.read();
            inbox.close();

            await expect(pendingRead).resolves.toEqual({ done: true, value: undefined });
        } finally {
            await releaseReader(reader);
        }
    });

    it("unblocks a pending read with the original error reason", async () => {
        const inbox = new StreamInbox<number>();
        const reader = inbox.readable.getReader();
        const reason = { code: "inbox failed" };

        try {
            const pendingRead = reader.read();
            inbox.error(reason);

            await expect(pendingRead).rejects.toBe(reason);
        } finally {
            await releaseReader(reader);
        }
    });

    it("discards buffered items on error and keeps the first terminal reason", async () => {
        const inbox = new StreamInbox<number>({ capacity: 2 });
        const reader = inbox.readable.getReader();
        const reason = { code: "inbox failed" };

        try {
            expect(inbox.post(1)).toBe(true);
            expect(inbox.post(2)).toBe(true);
            inbox.error(reason);
            inbox.error(new Error("later error"));
            inbox.close();

            await expect(reader.read()).rejects.toBe(reason);
            expect(inbox.post(3)).toBe(false);
        } finally {
            await releaseReader(reader);
        }
    });

    it("closes the inbox when its reader is cancelled", async () => {
        const inbox = new StreamInbox<number>();
        const reader = inbox.readable.getReader();

        try {
            expect(inbox.post(1)).toBe(true);
            await reader.cancel();

            expect(inbox.isClosed).toBe(true);
            expect(inbox.post(2)).toBe(false);
            await expect(reader.read()).resolves.toEqual({ done: true, value: undefined });
        } finally {
            await releaseReader(reader);
        }
    });

    it("makes capacity available after a reader consumes an item", async () => {
        const inbox = new StreamInbox<number>({ capacity: 1 });
        const reader = inbox.readable.getReader();

        try {
            expect(inbox.post(1)).toBe(true);
            expect(inbox.isFull).toBe(true);
            expect(await reader.read()).toEqual({ done: false, value: 1 });
            expect(inbox.free).toBe(1);
            expect(inbox.post(2)).toBe(true);
            expect(await reader.read()).toEqual({ done: false, value: 2 });
        } finally {
            await releaseReader(reader);
        }
    });

    it("rejects new items when the bounded queue is full", () => {
        const inbox = new StreamInbox<number>({ capacity: 1 });

        expect(inbox.post(1)).toBe(true);
        expect(inbox.post(2)).toBe(false);
        expect(inbox.size).toBe(1);
    });

    it("can drop the newest item on overflow", async () => {
        const inbox = new StreamInbox<number>({ capacity: 2, overflowPolicy: "drop-newest" });
        const reader = inbox.readable.getReader();

        try {
            expect(inbox.post(1)).toBe(true);
            expect(inbox.post(2)).toBe(true);
            expect(inbox.post(3)).toBe(false);
            inbox.close();

            expect(await reader.read()).toEqual({ done: false, value: 1 });
            expect(await reader.read()).toEqual({ done: false, value: 2 });
            expect(await reader.read()).toEqual({ done: true, value: undefined });
        } finally {
            await releaseReader(reader);
        }
    });
});
