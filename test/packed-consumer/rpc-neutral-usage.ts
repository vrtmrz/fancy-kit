import { call, defineContract, type PeerAddress } from "@vrtmrz/rpc";
import {
  RpcRoom,
  type RpcWireMessage,
  type TransportAdapter,
} from "@vrtmrz/rpc/p2p";

const contract = defineContract({
  echo: call<[value: string], string>(),
});

const peer: PeerAddress = { peerId: "packed-consumer", instanceId: "rpc" };
const transport: TransportAdapter = {
  send(_message: RpcWireMessage, _peerId: string) {},
  onMessage(_handler) {
    return () => {};
  },
};

const room = new RpcRoom({ transport });
room.register("example.echo", (_peerId, value: string) => value.toUpperCase());
const result: Promise<string> = room.session(peer.peerId).call<string>("example.echo", ["ready"]);
room.close();

void [contract, result];

// @ts-expect-error The neutral RPC declarations do not require DOM ambient types.
type NoImplicitDOM = AbortSignal;

// @ts-expect-error The neutral RPC declarations do not require Node ambient types.
type NoImplicitNode = NodeJS.Timeout;

export type { NoImplicitDOM, NoImplicitNode };
