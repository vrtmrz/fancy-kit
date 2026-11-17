import { createPairedFakeTransport } from "../facilities/pairedFakeTransport.js";
import type { FakeTransportEndpoint } from "../facilities/pairedFakeTransport.js";
import type { Transport } from "../../src/service/contracts.js";
import type { LegacyWire } from "./legacyTypes.js";

/** Adapt the existing fault-controlled transport; do not translate RPC envelopes. */
function adapt(
  endpoint: FakeTransportEndpoint<LegacyWire, undefined, never, false>,
) {
  const joins = new Set<(peerId: string) => void>();
  const leaves = new Set<(peerId: string) => void>();
  const transport: Transport<LegacyWire> = {
    send(message, peerId) {
      if (peerId !== endpoint.remotePeer.peerId)
        throw new Error(`Unexpected target ${peerId}`);
      return endpoint.send(endpoint.remotePeer, structuredClone(message));
    },
    onMessage(handler) {
      return endpoint.subscribe((from, wire) =>
        handler(wire as LegacyWire, from.peerId),
      );
    },
    onPeerJoin(handler) {
      joins.add(handler);
      return () => {
        joins.delete(handler);
      };
    },
    onPeerLeave(handler) {
      leaves.add(handler);
      return () => {
        leaves.delete(handler);
      };
    },
  };
  return {
    transport,
    join: () => {
      for (const handler of joins) handler(endpoint.remotePeer.peerId);
    },
    leave: () => {
      for (const handler of leaves) handler(endpoint.remotePeer.peerId);
    },
    get lifecycleListenerCount() {
      return joins.size + leaves.size;
    },
  };
}

/** Paired legacy wire with independent delivery and send-settlement controls. */
export function createLegacyPair() {
  const wire = createPairedFakeTransport<LegacyWire>({
    guaranteesRequestBeforeCancel: false,
  });
  return { wire, a: adapt(wire.a), b: adapt(wire.b) };
}
