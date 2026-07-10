// Obsolete code, kept for reference, but not active in tests
import { describe, expect, it } from "vitest";
describe("old_encodeBinary", () => {
    it("No longer tests for older implementations", async () => {
        expect(true).toBe(true);
    });
});
// import { _decodeToArrayBuffer, _encodeBinary, decodeToArrayBuffer } from "./encodedUTF16.ts";
// describe("old_encodeBinary", () => {
//     it("should encode a binary buffer into an array of strings", async () => {
//         {
//             const buffer = new Uint8Array(new Array(1024).map(() => Math.floor(Math.random() * 256)));
//             const result = await _encodeBinary(buffer);
//             const decoded = new Uint8Array(decodeToArrayBuffer(result));
//             expect(buffer).to.deep.equal(decoded);
//         }

//         {
//             const buffer = new Uint8Array(new Array(1024 * 1024 * 30).map(() => Math.floor(Math.random() * 256)));
//             const result = await _encodeBinary(buffer);
//             const decoded = new Uint8Array(decodeToArrayBuffer(result));
//             expect(buffer).to.deep.equal(decoded);
//         }
//     });
// });
