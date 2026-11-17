import type { Codec, JsonValue, Room, Session, Transport } from "../src/p2p.js";

declare const p2p: Room;
const session: Session = p2p.session("peer");
void session.call<string>("db.get", ["id"], 30000);
void session.call<void>("legacy/task", [], { timeoutMs: 0 });
void session.notify("legacy/onProgress", [1]);
// @ts-expect-error JSON P2P arguments do not admit raw binary data.
void session.call("db.put", [new Uint8Array(4)]);

// A separate binary implementation may implement the same operations without
// transfer, stream, multicast, DOM, or experimental endpoint types.
const binary: Session<Uint8Array> = {
  call: async <Result>(
    method: string,
    args?: Uint8Array[],
  ): Promise<Result> => {
    throw new Error(`Type-only composition: ${method}, ${args?.length}`);
  },
  notify: async () => undefined,
};
void binary.call<Uint8Array>("binary/hash", [new Uint8Array(8)]);
// @ts-expect-error Binary-only arguments remain constrained by the composition.
void binary.notify("binary/hash", ["text"]);

const codec: Codec<{ value: JsonValue }, string> = {
  encode: (value) => JSON.stringify(value),
  decode: (payload) => {
    if (typeof payload !== "string") throw new Error("Expected string");
    return JSON.parse(payload) as { value: JsonValue };
  },
};
declare const transport: Transport<string, { priority: number }>;
void transport.send(codec.encode({ value: 1 }), "peer", { priority: 2 });
// @ts-expect-error Encoded payload and physical transport wire must match at composition.
void transport.send(new Uint8Array(2), "peer");
// @ts-expect-error Local sending options retain their transport-specific type.
void transport.send("payload", "peer", { priority: "high" });
