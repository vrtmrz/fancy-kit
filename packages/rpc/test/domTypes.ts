/**
 * Compile-time DOM compatibility check verifying that real Web `MessagePort`,
 * `Worker`, `MessageChannel`, `BroadcastChannel`, and `AbortController`
 * satisfy `@vrtmrz/rpc` and `@vrtmrz/rpc/worker` signatures without type casts.
 */

import {
  call,
  createRpcEndpoint,
  defineContract,
  withTransfer,
  type PeerAddress,
} from "../src/index.js";
import {
  assertReachableTransferables,
  createIdentityCodec,
  createMessagePortTransport,
  type WorkerTransferData,
  type WorkerTransferPort,
  type WorkerTransferProfile,
} from "../src/worker.js";

const domContract = defineContract({
  binary: call<[buf: Uint8Array], Uint8Array>().transfer({
    input: "required",
    result: "required",
  }),
  copyRich: call<[blob: Blob, map: Map<string, Date>], string>(),
  forwardPort: call<[port: WorkerTransferPort], void>().transfer({
    input: "required",
  }),
});

declare const port: MessagePort;
declare const worker: Worker;
declare const broadcast: BroadcastChannel;
declare const peer: PeerAddress;
declare const channel: MessageChannel;
declare const sampleBlob: Blob;
declare const sampleMap: Map<string, Date>;
declare const profileUnion: WorkerTransferProfile;

const defaultTransport = createMessagePortTransport({
  port,
  remotePeer: peer,
});
const portEnabledTransport = createMessagePortTransport({
  port: worker,
  remotePeer: peer,
  transferProfile: "binary-data-and-ports",
});

const epDefault = createRpcEndpoint({
  contract: domContract,
  codec: createIdentityCodec(),
  transport: defaultTransport,
  localPeer: peer,
});

const epPorts = createRpcEndpoint({
  contract: domContract,
  codec: createIdentityCodec(),
  transport: portEnabledTransport,
  localPeer: peer,
});

const cDefault = epDefault.bindPeer(peer);
const bytes = new Uint8Array([1, 2, 3]);
const ac = new AbortController();
void cDefault.call.binary([withTransfer(bytes, [bytes.buffer])], { signal: ac.signal });
void cDefault.call.copyRich([sampleBlob, sampleMap]);

const cPorts = epPorts.bindPeer(peer);
void cPorts.call.forwardPort([withTransfer(channel.port2, [channel.port2])]);
void cPorts.call.copyRich([sampleBlob, sampleMap]);

// Narrowing a union profile enables explicit port forwarding cleanly.
if (profileUnion === "binary-data-and-ports") {
  const narrowedTransport = createMessagePortTransport({
    port,
    remotePeer: peer,
    transferProfile: profileUnion,
  });
  void narrowedTransport;
  void assertReachableTransferables([channel.port2], [channel.port2], {
    transferProfile: profileUnion,
  });
}

// Data-shape checks with real DOM types.
const validWorkerData: WorkerTransferData = {
  tag: "header",
  size: 3n,
  bytes,
  nested: [new ArrayBuffer(4), new DataView(bytes.buffer)],
};
const validPortData: WorkerTransferData<WorkerTransferPort> = {
  port: channel.port2,
  bytes,
};
void [validWorkerData, validPortData];

// ---------------------------------------------------------------------------
// Expected compile-time errors
// ---------------------------------------------------------------------------

// @ts-expect-error Default binary-data profile must reject MessagePort transfer.
void cDefault.call.forwardPort([withTransfer(channel.port2, [channel.port2])]);

// @ts-expect-error Union-valued profile option requires narrowing before creation.
createMessagePortTransport({ port, remotePeer: peer, transferProfile: profileUnion });

// @ts-expect-error Default assertReachableTransferables rejects MessagePort resources.
assertReachableTransferables([channel.port2], [channel.port2]);

// @ts-expect-error Browser Worker is a connection endpoint, not a transferable MessagePort.
const invalidWorkerAsPort: WorkerTransferPort = worker;

// @ts-expect-error BroadcastChannel is not a transferable MessagePort.
const invalidBroadcastAsPort: WorkerTransferPort = broadcast;

// @ts-expect-error DOM Blob is excluded from WorkerTransferData.
const invalidBlobData: WorkerTransferData = sampleBlob;

void [invalidWorkerAsPort, invalidBroadcastAsPort, invalidBlobData];
