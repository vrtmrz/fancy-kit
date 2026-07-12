import { describe, expect, it } from "vitest";

import { createStreamInbox, StreamInbox } from "./StreamInbox.ts";

describe("StreamInbox", () => {
    it("bridges posted items to a readable stream", async () => {
        const inbox = createStreamInbox<number>({ capacity: 4 });
        const reader = inbox.readable.getReader();

        expect(inbox.post(1)).toBe(true);
        expect(inbox.post(2)).toBe(true);
        inbox.close();

        expect(await reader.read()).toEqual({ done: false, value: 1 });
        expect(await reader.read()).toEqual({ done: false, value: 2 });
        expect(await reader.read()).toEqual({ done: true, value: undefined });
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

        expect(inbox.post(1)).toBe(true);
        expect(inbox.post(2)).toBe(true);
        expect(inbox.post(3)).toBe(false);
        inbox.close();

        expect(await reader.read()).toEqual({ done: false, value: 1 });
        expect(await reader.read()).toEqual({ done: false, value: 2 });
        expect(await reader.read()).toEqual({ done: true, value: undefined });
    });
});
