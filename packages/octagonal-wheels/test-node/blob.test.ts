import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("the focused Blob module imports without platform globals and uses Blob only when called", () => {
    const moduleUrl = new URL("../src/binary/blob.ts", import.meta.url).href;
    const result = spawnSync(
        process.execPath,
        [
            "--import",
            "tsx",
            "--input-type=module",
            "--eval",
            `
        import assert from "node:assert/strict";
        const NativeBlob = globalThis.Blob;
        for (const name of ["Blob", "window", "document", "fetch", "indexedDB", "FileReader"]) {
            Object.defineProperty(globalThis, name, {
                configurable: true,
                get() { throw new Error("Unexpected global access: " + name); },
            });
        }
        const { createTextBlob, createBinaryBlob, toBlob, isBlobContentEqual } = await import(${JSON.stringify(moduleUrl)});
        Object.defineProperty(globalThis, "Blob", { configurable: true, value: NativeBlob });
        const text = createTextBlob(["first\\r", "\\nlast"]);
        assert.equal(await text.text(), "first\\r\\nlast");
        assert.equal(text.type, "text/plain");
        const bytes = new Uint8Array([255, 1, 2, 255]);
        const binary = createBinaryBlob(bytes.subarray(1, 3));
        bytes.fill(0);
        assert.deepEqual(new Uint8Array(await binary.arrayBuffer()), new Uint8Array([1, 2]));
        assert.equal(binary.type, "application/octet-stream");
        assert.equal(toBlob(text), text);
        assert.equal(toBlob([]).size, 0);
        assert.equal(
            await isBlobContentEqual(
                new Blob(["same"], { type: "text/plain" }),
                new Blob(["same"], { type: "application/custom" })
            ),
            true
        );
        const longContent = new Uint8Array(10_002).fill(23);
        const differentLongContent = longContent.slice();
        differentLongContent[10_001] = 24;
        assert.equal(
            await isBlobContentEqual(new Blob([longContent]), new Blob([differentLongContent])),
            false
        );
        const customLeft = new Uint8Array(10_003).fill(7);
        const customRight = customLeft.slice();
        const comparedPartLengths = [];
        assert.equal(
            await isBlobContentEqual(
                new Blob([customLeft]),
                new Blob([customRight]),
                async (left, right) => {
                    assert.equal(left.byteLength, right.byteLength);
                    comparedPartLengths.push(left.byteLength);
                    const leftBytes = new Uint8Array(left);
                    const rightBytes = new Uint8Array(right);
                    return leftBytes.every((byte, index) => byte === rightBytes[index]);
                }
            ),
            true
        );
        assert.deepEqual(comparedPartLengths, [10_000, 3]);
    `,
        ],
        { encoding: "utf8" }
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
