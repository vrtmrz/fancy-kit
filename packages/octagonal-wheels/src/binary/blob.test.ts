import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
    createBinaryBlob,
    createTextBlob,
    isBlobContentEqual,
    toBlob,
    type ArrayBufferContentEquality,
} from "./blob.ts";

afterEach(() => vi.restoreAllMocks());

describe("Blob conversion", () => {
    it("preserves Unicode and mixed line endings in plain text", async () => {
        const text = "日本語 🐙\r\nsecond\nthird\rfourth\0";
        const blob = createTextBlob(text);
        expect(blob.type).toBe("text/plain");
        expect(await blob.text()).toBe(text);
        expect(blob.size).toBe(new TextEncoder().encode(text).byteLength);
        expect(createTextBlob(text)).not.toBe(blob);
    });

    it("concatenates text parts without inserting separators", async () => {
        const parts = ["first\r", "\n日本語", "", "\nlast"];
        const blob = createTextBlob(parts);
        parts[0] = "changed";
        expect(await blob.text()).toBe("first\r\n日本語\nlast");
    });

    it("retains native string-part conversion for split surrogate pairs", async () => {
        expect(await createTextBlob(["\ud83d", "\udc19"]).text()).toBe("\ufffd\ufffd");
        expect(await createTextBlob("\ud83d\udc19").text()).toBe("🐙");
    });

    it("creates empty text Blobs for empty text or text parts", () => {
        for (const blob of [createTextBlob(""), createTextBlob([]), createTextBlob(["", ""])]) {
            expect(blob.size).toBe(0);
            expect(blob.type).toBe("text/plain");
        }
    });

    it("snapshots only the visible bytes of a Uint8Array", async () => {
        const bytes = new Uint8Array([255, 0, 128, 254, 255]);
        const view = bytes.subarray(1, 4);
        const blob = createBinaryBlob(view);
        bytes.fill(17);
        expect(blob.type).toBe("application/octet-stream");
        expect(blob.size).toBe(3);
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([0, 128, 254]));
    });

    it("snapshots complete ArrayBuffers and accepts empty binary inputs", async () => {
        const bytes = new Uint8Array([0, 127, 255]);
        const blob = createBinaryBlob(bytes.buffer);
        bytes.fill(17);
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([0, 127, 255]));
        expect(createBinaryBlob(new ArrayBuffer(0)).size).toBe(0);
        expect(createBinaryBlob(new Uint8Array()).type).toBe("application/octet-stream");
        expect(createBinaryBlob(bytes)).not.toBe(createBinaryBlob(bytes));
    });

    it("returns an existing Blob or File unchanged", () => {
        const blob = new Blob(['{"value":1}'], { type: "application/json" });
        const file = new File(["payload"], "sample.txt", { type: "text/custom", lastModified: 123 });
        expect(toBlob(blob)).toBe(blob);
        expect(toBlob(blob).type).toBe("application/json");
        expect(toBlob(file)).toBe(file);
        expect(toBlob(new Blob()).type).toBe("");
    });

    it("normalises each supported input with its text or binary MIME type", async () => {
        const text = "a\r\n日本語";
        for (const input of [text, ["a\r", "\n日本語"]]) {
            const blob = toBlob(input);
            expect(blob.type).toBe("text/plain");
            expect(await blob.text()).toBe(text);
        }
        const bytes = new Uint8Array([255, 1, 2, 255]);
        for (const input of [bytes.subarray(1, 3), new Uint8Array([1, 2]).buffer]) {
            const blob = toBlob(input);
            expect(blob.type).toBe("application/octet-stream");
            expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2]));
        }
        expect(toBlob([]).type).toBe("text/plain");
        expect(toBlob(new ArrayBuffer(0)).type).toBe("application/octet-stream");
    });
});

function observeBlobReads(blob: Blob, label: string, events: string[] = []) {
    const read = vi.spyOn(blob, "arrayBuffer");
    const originalSlice = blob.slice.bind(blob);
    const parts: { size: number; read: MockInstance<() => Promise<ArrayBuffer>> }[] = [];
    const slice = vi.spyOn(blob, "slice").mockImplementation((start, end, contentType) => {
        const part = originalSlice(start, end, contentType);
        const originalRead = part.arrayBuffer.bind(part);
        const partRead = vi.spyOn(part, "arrayBuffer").mockImplementation(() => {
            events.push(`${label}:${start}:${end}`);
            return originalRead();
        });
        parts.push({ size: part.size, read: partRead });
        return part;
    });
    return { blob, read, slice, parts };
}

describe("Blob content equality", () => {
    it("does not read or invoke the predicate when sizes differ", async () => {
        const left = observeBlobReads(new Blob(["short"]), "left");
        const right = observeBlobReads(new Blob(["longer"]), "right");
        const equal = vi.fn<ArrayBufferContentEquality>(() => true);

        expect(await isBlobContentEqual(left.blob, right.blob, equal)).toBe(false);
        for (const input of [left, right]) {
            expect(input.read).not.toHaveBeenCalled();
            expect(input.slice).not.toHaveBeenCalled();
        }
        expect(equal).not.toHaveBeenCalled();
    });

    it("accepts empty Blobs without reading or invoking the predicate", async () => {
        const left = observeBlobReads(new Blob([], { type: "text/plain" }), "left");
        const right = observeBlobReads(new Blob([], { type: "application/custom" }), "right");
        const equal = vi.fn<ArrayBufferContentEquality>(() => false);

        expect(await isBlobContentEqual(left.blob, right.blob, equal)).toBe(true);
        expect(left.slice).not.toHaveBeenCalled();
        expect(right.slice).not.toHaveBeenCalled();
        expect(left.read).not.toHaveBeenCalled();
        expect(right.read).not.toHaveBeenCalled();
        expect(equal).not.toHaveBeenCalled();
    });

    it("compares bytes independently of MIME types and File metadata", async () => {
        const text = "日本語 🐙\r\ntext\0";
        const left = createTextBlob(text);
        const right = new File([text], "different-name.bin", { type: "application/custom", lastModified: 123 });

        expect(await isBlobContentEqual(left, right)).toBe(true);
        expect(await isBlobContentEqual(toBlob(["first", "second"]), toBlob("firstsecond"))).toBe(true);
        expect(await isBlobContentEqual(createTextBlob("one"), createTextBlob("two"))).toBe(false);
    });

    it("reads each pair sequentially in bounded parts", async () => {
        const bytes = Uint8Array.from({ length: 25_001 }, (_, index) => index % 256);
        const events: string[] = [];
        const left = observeBlobReads(new Blob([bytes]), "left", events);
        const right = observeBlobReads(new Blob([bytes]), "right", events);

        expect(await isBlobContentEqual(left.blob, right.blob)).toBe(true);
        expect(events).toEqual([
            "left:0:10000",
            "right:0:10000",
            "left:10000:20000",
            "right:10000:20000",
            "left:20000:30000",
            "right:20000:30000",
        ]);
        for (const input of [left, right]) {
            expect(input.read).not.toHaveBeenCalled();
            expect(input.parts.map((part) => part.size)).toEqual([10_000, 10_000, 5_001]);
            for (const part of input.parts) expect(part.read).toHaveBeenCalledTimes(1);
        }
    });

    it.each([
        { length: 10_000, reads: 1 },
        { length: 10_001, reads: 2 },
        { length: 20_000, reads: 2 },
    ])("reads no extra part at length $length", async ({ length, reads }) => {
        const left = observeBlobReads(new Blob([new Uint8Array(length)]), "left");
        const right = observeBlobReads(new Blob([new Uint8Array(length)]), "right");

        expect(await isBlobContentEqual(left.blob, right.blob)).toBe(true);
        expect(left.slice).toHaveBeenCalledTimes(reads);
        expect(right.slice).toHaveBeenCalledTimes(reads);
    });

    it.each([
        { offset: 0, reads: 1 },
        { offset: 9_999, reads: 1 },
        { offset: 10_000, reads: 2 },
        { offset: 20_000, reads: 3 },
    ])("stops after detecting a difference at byte $offset", async ({ offset, reads }) => {
        const bytes = new Uint8Array(25_001);
        const changed = bytes.slice();
        changed[offset] = 1;
        const left = observeBlobReads(new Blob([bytes]), "left");
        const right = observeBlobReads(new Blob([changed]), "right");

        expect(await isBlobContentEqual(left.blob, right.blob)).toBe(false);
        expect(left.slice).toHaveBeenCalledTimes(reads);
        expect(right.slice).toHaveBeenCalledTimes(reads);
    });

    it.each([false, true])("uses the supplied equality result, asynchronous=%s", async (asynchronous) => {
        const equal = vi.fn<ArrayBufferContentEquality>((left, right) => {
            expect(new Uint8Array(left)).toEqual(new Uint8Array([0, 128, 255]));
            expect(new Uint8Array(right)).toEqual(new Uint8Array([1, 129, 254]));
            return asynchronous ? Promise.resolve(true) : true;
        });

        expect(
            await isBlobContentEqual(
                createBinaryBlob(new Uint8Array([0, 128, 255])),
                createBinaryBlob(new Uint8Array([1, 129, 254])),
                equal
            )
        ).toBe(true);
        expect(equal).toHaveBeenCalledTimes(1);
    });

    it("waits for the injected predicate before reading another pair", async () => {
        const pending = Promise.withResolvers<boolean>();
        const left = observeBlobReads(new Blob([new Uint8Array(10_001)]), "left");
        const right = observeBlobReads(new Blob([new Uint8Array(10_001)]), "right");
        const equal = vi
            .fn<ArrayBufferContentEquality>()
            .mockResolvedValue(true)
            .mockImplementationOnce(() => pending.promise);

        const result = isBlobContentEqual(left.blob, right.blob, equal);
        await vi.waitFor(() => expect(equal).toHaveBeenCalledTimes(1));
        expect(left.slice).toHaveBeenCalledTimes(1);
        expect(right.slice).toHaveBeenCalledTimes(1);
        pending.resolve(true);

        expect(await result).toBe(true);
        expect(equal).toHaveBeenCalledTimes(2);
        expect(equal.mock.calls.map(([leftPart, rightPart]) => [leftPart.byteLength, rightPart.byteLength])).toEqual([
            [10_000, 10_000],
            [1, 1],
        ]);
    });

    it("stops when the injected predicate rejects equality", async () => {
        const left = observeBlobReads(new Blob([new Uint8Array(20_001)]), "left");
        const right = observeBlobReads(new Blob([new Uint8Array(20_001)]), "right");
        const equal = vi.fn<ArrayBufferContentEquality>().mockReturnValueOnce(true).mockReturnValueOnce(false);

        expect(await isBlobContentEqual(left.blob, right.blob, equal)).toBe(false);
        expect(equal).toHaveBeenCalledTimes(2);
        expect(left.slice).toHaveBeenCalledTimes(2);
        expect(right.slice).toHaveBeenCalledTimes(2);
    });

    it.each([false, true])("propagates a predicate failure unchanged, asynchronous=%s", async (asynchronous) => {
        const error = new Error("Equality predicate failed");
        const equal = vi.fn<ArrayBufferContentEquality>(() => {
            if (asynchronous) return Promise.reject(error);
            throw error;
        });
        const left = observeBlobReads(new Blob([new Uint8Array(20_001)]), "left");
        const right = observeBlobReads(new Blob([new Uint8Array(20_001)]), "right");

        await expect(isBlobContentEqual(left.blob, right.blob, equal)).rejects.toBe(error);
        expect(equal).toHaveBeenCalledTimes(1);
        expect(left.slice).toHaveBeenCalledTimes(1);
        expect(right.slice).toHaveBeenCalledTimes(1);
    });

    it.each(["left", "right"])("propagates a %s read failure before invoking the predicate", async (side) => {
        const error = new Error("Blob read failed");
        const left = observeBlobReads(new Blob(["same"]), "left");
        const right = observeBlobReads(new Blob(["same"]), "right");
        const failing = side === "left" ? left : right;
        const part = new Blob(["same"]);
        vi.spyOn(part, "arrayBuffer").mockRejectedValue(error);
        failing.slice.mockReturnValue(part);
        const equal = vi.fn<ArrayBufferContentEquality>(() => true);

        await expect(isBlobContentEqual(left.blob, right.blob, equal)).rejects.toBe(error);
        expect(equal).not.toHaveBeenCalled();
        expect(left.slice).toHaveBeenCalledTimes(1);
        expect(right.slice).toHaveBeenCalledTimes(side === "left" ? 0 : 1);
    });
});


describe("default Blob comparison strategy", () => {
    it.each([true, false])("compares bytes with native encoding available=%s", async (nativeAvailable) => {
        const prototype = Uint8Array.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "toBase64");
        const encode = vi.fn(function (this: Uint8Array) {
            return Array.from(this).join(",");
        });
        Object.defineProperty(prototype, "toBase64", {
            configurable: true,
            writable: true,
            value: nativeAvailable ? encode : undefined,
        });
        const browserEncode = vi.spyOn(globalThis, "btoa").mockImplementation(() => {
            throw new Error("The comparison fallback must not encode strings.");
        });
        try {
            const left = new Blob([new Uint8Array([0, 1, 255, 4, 5])]);
            const same = new Blob([new Uint8Array([0, 1, 255, 4, 5])]);
            const different = new Blob([new Uint8Array([0, 1, 255, 4, 6])]);
            expect(await isBlobContentEqual(left, same)).toBe(true);
            expect(await isBlobContentEqual(left, different)).toBe(false);
            expect(encode).toHaveBeenCalledTimes(nativeAvailable ? 4 : 0);
            expect(browserEncode).not.toHaveBeenCalled();
        } finally {
            browserEncode.mockRestore();
            if (descriptor) Object.defineProperty(prototype, "toBase64", descriptor);
            else Reflect.deleteProperty(prototype, "toBase64");
        }
    });
});
