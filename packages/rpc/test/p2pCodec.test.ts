import { describe, expect, it } from "vitest";
import { createJsonCodec } from "../src/p2p.js";
const codec = createJsonCodec();
describe("legacy JSON envelope boundary", () => {
  it.each([
    null,
    {},
    { kind: "unknown", requestId: "r" },
    { kind: "request", requestId: "r", method: "db.x", args: null },
    { kind: "response", requestId: "r", ok: false, error: "bad" },
  ])("rejects malformed envelope %j", (value) => {
    expect(() => codec.decode(JSON.stringify(value))).toThrow(TypeError);
  });
  it("preserves notification, error details, and JSON void-response shapes", () => {
    const notification = {
      kind: "request" as const,
      requestId: "r",
      method: "db.x",
      args: [],
      expectsResponse: false as const,
    };
    expect(codec.decode(codec.encode(notification))).toEqual(notification);
    const error = {
      kind: "response" as const,
      requestId: "r",
      ok: false as const,
      error: {
        code: "REMOTE_ERROR" as const,
        message: "failure",
        details: { revision: 2 },
      },
    };
    expect(codec.decode(codec.encode(error))).toEqual(error);
    expect(
      codec.decode('{"kind":"response","requestId":"r","ok":true}'),
    ).toEqual({ kind: "response", requestId: "r", ok: true });
  });
});
