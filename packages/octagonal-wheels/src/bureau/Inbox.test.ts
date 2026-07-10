import { describe, it, expect, beforeEach } from "vitest";
import { Inbox, NOT_AVAILABLE } from "./Inbox.ts";
import { isResolved, promiseWithResolvers } from "../promises.ts";

describe("Inbox", () => {
    let inbox: Inbox<number>;

    beforeEach(() => {
        inbox = new Inbox<number>(3);
    });

    it("should initialize with the correct capacity", () => {
        expect(inbox._capacity).toBe(3);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should post and pick items correctly", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);

        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);

        const item1 = await inbox.pick();
        const item2 = await inbox.pick();
        const item3 = await inbox.pick();

        expect(item1).toBe(1);
        expect(item2).toBe(2);
        expect(item3).toBe(3);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should handle tryPost and tryPick correctly", async () => {
        await inbox.tryPost(1);
        await inbox.tryPost(2);
        await inbox.tryPost(3);

        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);

        const tryPostResult = await inbox.tryPost(4);
        expect(tryPostResult).toBe(false);

        const item1 = await inbox.tryPick();
        const item2 = await inbox.tryPick();
        const item3 = await inbox.tryPick();
        const item4 = await inbox.tryPick();

        expect(item1).toBe(1);
        expect(item2).toBe(2);
        expect(item3).toBe(3);
        expect(item4).toBe(NOT_AVAILABLE);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should throw an error if capacity is less than or equal to 0", () => {
        expect(() => new Inbox<number>(0)).toThrow("Capacity must be greater than 0");
    });

    it("should wait for free space when posting in blocking mode", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);

        const postPromise = inbox.post(4);
        await inbox.pick();
        const postResult = await postPromise;

        expect(postResult).toBe(true);
        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);
    });

    it("should wait for items when picking in blocking mode", async () => {
        const pickPromise = inbox.pick();
        await inbox.post(1);
        const pickResult = await pickPromise;

        expect(pickResult).toBe(1);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should safe on 2^n capacity", async () => {
        const postBox = new Inbox<number>(4);
        expect(postBox._wrapAroundCount).toBe(255);
        for (let i = 0; i < 4; i++) {
            postBox.post(i);
        }
        expect(postBox.size).toBe(4);
        expect(postBox.free).toBe(0);
        expect(postBox.isFull).toBe(true);
        expect(postBox.isRunningOut).toBe(false);
        const tryPostResult = await postBox.tryPost(5);
        expect(tryPostResult).toBe(false);
        for (let i = 0; i < 4; i++) {
            const item = await postBox.pick();
            expect(item).toBe(i);
        }
        expect(postBox.size).toBe(0);
        expect(postBox.free).toBe(4);

        const postBox2 = new Inbox<number>(256);
        expect(postBox2._wrapAroundCount).toBe(511);
    });

    it("should dispose correctly while posting", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);
        const postPromise = inbox.post(4);

        expect(await isResolved(postPromise)).toBe(false);
        inbox.dispose();

        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(0);
        expect(inbox.isDisposed).toBe(true);
        await expect(postPromise).rejects.toThrowError();

        await expect(() => inbox.post(4)).rejects.toThrowError();
        await expect(() => inbox.pick()).rejects.toThrowError();
    });

    it("should dispose correctly while picking", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);
        expect(await inbox.pick()).toBe(1);
        expect(await inbox.pick()).toBe(2);
        expect(await inbox.pick()).toBe(3);
        const pickPromise = inbox.pick();

        expect(await isResolved(pickPromise)).toBe(false);
        inbox.dispose();

        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(0);
        expect(inbox.isDisposed).toBe(true);
        await expect(pickPromise).rejects.toThrowError();

        await expect(() => inbox.post(4)).rejects.toThrowError();
        await expect(() => inbox.pick()).rejects.toThrowError();
    });

    it("should timeout correctly", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);
        const postPromise = inbox.post(4, 100);
        expect(await isResolved(postPromise)).toBe(false);
        await new Promise((r) => setTimeout(r, 200));
        expect(await postPromise).toBe(false);
        expect(await inbox.pick()).toBe(1);
        expect(await inbox.pick()).toBe(2);
        expect(await inbox.pick()).toBe(3);
        const pickPromise = inbox.pick(100);
        expect(await isResolved(pickPromise)).toBe(false);
        await new Promise((r) => setTimeout(r, 200));
        expect(await pickPromise).toBe(NOT_AVAILABLE);
    });

    it("should cancelled by other promises correctly", async () => {
        await inbox.post(1);
        //cancelled by other promise, so it will not be posted
        await inbox.post(2, undefined, [Promise.resolve()]);
        const p = promiseWithResolvers<void>();
        // p.promise has not been resolved, so 3 will be posted
        await inbox.post(3, undefined, [p.promise]);
        await inbox.post(4);
        expect(await inbox.pick()).toBe(1);
        //cancelled by other promise, so it will not be picked `3` up
        expect(await inbox.pick(undefined, [Promise.resolve()])).toBe(NOT_AVAILABLE);
        expect(await inbox.pick()).toBe(3);
        //p.promise has not been resolved, so 4 will be picked up
        expect(await inbox.pick(undefined, [p.promise])).toBe(4);
    });

    it("should cancel the last post correctly", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);

        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);

        const cancelledItem = inbox.tryCancelPost();
        expect(cancelledItem).toBe(3);
        expect(inbox.size).toBe(2);
        expect(inbox.free).toBe(1);
        await inbox.post(4);
        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);

        const item1 = await inbox.pick();
        const item2 = await inbox.pick();
        const item3 = await inbox.pick();
        expect(item1).toBe(1);
        expect(item2).toBe(2);
        expect(item3).toBe(4);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should cancel all posts correctly", async () => {
        await inbox.post(1);
        await inbox.post(2);
        await inbox.post(3);

        expect(inbox.size).toBe(3);
        expect(inbox.free).toBe(0);

        const cancelledItems1 = inbox.tryCancelPost();
        expect(cancelledItems1).toEqual(3);
        const cancelledItems2 = inbox.tryCancelPost();
        expect(cancelledItems2).toEqual(2);
        const cancelledItems3 = inbox.tryCancelPost();
        expect(cancelledItems3).toEqual(1);
        const cancelledItems4 = inbox.tryCancelPost();
        expect(cancelledItems4).toEqual(NOT_AVAILABLE);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should return NOT_AVAILABLE if the buffer is empty", () => {
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);

        const result = inbox.tryCancelPost();
        expect(result).toBe(NOT_AVAILABLE);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });

    it("should return NOT_AVAILABLE if the buffer has got be empty", async () => {
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);

        await inbox.post(1);
        await inbox.post(2);

        expect(inbox.size).toBe(2);
        expect(inbox.free).toBe(1);
        expect(await inbox.pick()).toBe(1);
        expect(await inbox.pick()).toBe(2);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);

        const result = inbox.tryCancelPost();
        expect(result).toBe(NOT_AVAILABLE);
        expect(inbox.size).toBe(0);
        expect(inbox.free).toBe(3);
    });
});
