import assert from "node:assert/strict";
import { test } from "node:test";
import { arrayBufferToBase64 } from "../src/binary/base64.ts";
import { encodeBinary } from "../src/binary/index.ts";

const expectedPayload = Uint8Array.from({ length: 65_536 }, (_, index) => index % 251);
const backing = new Uint8Array(expectedPayload.byteLength + 17);
backing.fill(255);
backing.set(expectedPayload, 11);
const payload = backing.subarray(11, 11 + expectedPayload.byteLength);
const expected = Buffer.from(payload).toString("base64");

for (const [name, encode] of [
    ["arrayBufferToBase64", arrayBufferToBase64],
    ["encodeBinary", encodeBinary],
] as const) {
    test(`${name} encodes a large buffer without DOM globals`, async () => {
        assert.deepEqual(await encode(payload), [expected]);
    });
}
