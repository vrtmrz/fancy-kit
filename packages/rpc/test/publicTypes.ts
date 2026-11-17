/**
 * Compile-time type fixtures for `@vrtmrz/rpc` checked under pure ES2022
 * (`tsconfig.types.json`, `types: []`, no DOM or Node ambient types).
 */

import {
  call,
  createRpcEndpoint,
  defineContract,
  notify,
  pickContract,
  RpcError,
  serialiseRpcError,
  withTransfer,
  type CallableKeys,
  type CancelSignal,
  type ClientArgs,
  type HandlerResult,
  type MultiNotifiableKeys,
  type NotifiableKeys,
  type PeerAddress,
  type PeerSendOutcome,
  type RpcCodec,
  type RpcEnvelope,
  type RpcErrorCode,
  type RpcMethodDescriptor,
  type RpcPeerClient,
  type RpcTransport,
} from "../src/index.js";
import {
  assertReachableTransferables,
  createIdentityCodec,
  createMessagePortTransport,
  type MessagePortLike,
  type WorkerTransferData,
  type WorkerTransferPort,
  type WorkerTransferProfile,
} from "../src/worker.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;
type Assert<T extends true> = T;

declare const unionTransferDescriptor: RpcMethodDescriptor<
  "notify",
  readonly [number],
  void,
  "required" | "none",
  "none"
>;

const contract = defineContract({
  encrypt: call<[data: Uint8Array, key: string], Uint8Array>(),
  flush: call<[], void>(),
  ping: notify<[ts: number]>(),
  optionalObject: call<[payload?: { readonly timeoutMs?: number }], string>(),
  restBytes: call<[...chunks: Uint8Array[]], number>(),
  binaryRequired: call<[payload: Uint8Array], Uint8Array>().transfer({
    input: "required",
    result: "required",
  }),
  binaryOptional: call<[payload: Uint8Array], Uint8Array>().transfer({
    input: "optional",
    result: "optional",
  }),
  optionalTransferRequired: call<[payload?: Uint8Array], void>().transfer({
    input: "required",
  }),
  mixedOptionalTransferRequired: call<[label: string, payload?: Uint8Array], void>().transfer({
    input: "required",
  }),
  restTransferRequired: call<[...chunks: Uint8Array[]], void>().transfer({
    input: "required",
  }),
  optRestTransferRequired: call<[tag?: string, ...chunks: Uint8Array[]], void>().transfer({
    input: "required",
  }),
  unionTransferNotify: unionTransferDescriptor,
});

const subset = pickContract(contract, ["encrypt", "ping"]);

type CheckCallable = Assert<
  Equal<
    CallableKeys<typeof contract>,
    | "encrypt"
    | "flush"
    | "optionalObject"
    | "restBytes"
    | "binaryRequired"
    | "binaryOptional"
    | "optionalTransferRequired"
    | "mixedOptionalTransferRequired"
    | "restTransferRequired"
    | "optRestTransferRequired"
  >
>;
type CheckNotifiable = Assert<
  Equal<
    NotifiableKeys<typeof contract>,
    | "encrypt"
    | "flush"
    | "ping"
    | "optionalObject"
    | "restBytes"
    | "binaryRequired"
    | "binaryOptional"
    | "optionalTransferRequired"
    | "mixedOptionalTransferRequired"
    | "restTransferRequired"
    | "optRestTransferRequired"
    | "unionTransferNotify"
  >
>;
type CheckMultiNotifiable = Assert<
  Equal<
    MultiNotifiableKeys<typeof contract>,
    "encrypt" | "flush" | "ping" | "optionalObject" | "restBytes" | "binaryOptional"
  >
>;
type CheckSubsetCallable = Assert<Equal<CallableKeys<typeof subset>, "encrypt">>;

type RequiredCallerArgs = ClientArgs<[Uint8Array], "required", ArrayBuffer>;
type RequiredHandlerRet = HandlerResult<Uint8Array, "required", ArrayBuffer>;
type OptionalHandlerRet = HandlerResult<Uint8Array, "optional", ArrayBuffer>;

const sample = new Uint8Array([1, 2, 3]);
const validWrappedArgs: RequiredCallerArgs = [withTransfer(sample, [sample.buffer])];
const validWrappedReturn: RequiredHandlerRet = withTransfer(sample, [sample.buffer]);
const validOptionalReturn: OptionalHandlerRet = sample;

declare const neutralCodec: RpcCodec<RpcEnvelope, string>;
declare const neutralTransport: RpcTransport<string, { readonly tag?: string }, never, false>;
declare const peerClient: RpcPeerClient<typeof contract, { readonly tag?: string }, ArrayBuffer>;
declare const peerAddress: PeerAddress;
declare const cancelSignal: CancelSignal;

const emptyCallNoArgs: Promise<void> = peerClient.call.flush();
const emptyCallWithOptions: Promise<void> = peerClient.call.flush([], { timeoutMs: 500 });
const optionalArgSeparated: Promise<string> = peerClient.call.optionalObject(
  [{ timeoutMs: 10 }],
  { timeoutMs: 500 },
);
const optionalArgOmitted: Promise<string> = peerClient.call.optionalObject([], {
  timeoutMs: 500,
});
const restCallSeparated: Promise<number> = peerClient.call.restBytes([sample, sample], {
  timeoutMs: 500,
});
const optRequiredCall: Promise<void> = peerClient.call.optionalTransferRequired([
  withTransfer(sample, [sample.buffer]),
]);
const mixedOptRequiredFirst: Promise<void> = peerClient.call.mixedOptionalTransferRequired([
  withTransfer("label", [sample.buffer]),
]);
const mixedOptRequiredSecond: Promise<void> = peerClient.call.mixedOptionalTransferRequired([
  "label",
  withTransfer(sample, [sample.buffer]),
]);
const restRequiredCall: Promise<void> = peerClient.call.restTransferRequired([
  withTransfer(sample, [sample.buffer]),
  sample,
]);
const restRequiredLaterCall: Promise<void> = peerClient.call.restTransferRequired([
  sample,
  withTransfer(sample, [sample.buffer]),
  sample,
]);
const optRestRequiredCall: Promise<void> = peerClient.call.optRestTransferRequired([
  "tag",
  withTransfer(sample, [sample.buffer]),
]);
const optRestRequiredLaterCall: Promise<void> = peerClient.call.optRestTransferRequired([
  "tag",
  sample,
  withTransfer(sample, [sample.buffer]),
]);

const encodedPayload: string = neutralCodec.encode({
  kind: "notify",
  version: 1,
  sender: peerAddress,
  method: "ping",
  args: [1],
});
const errorSample = new RpcError("timeout", "Request timed out.", { peer: peerAddress });
const wireError = serialiseRpcError(errorSample);
const codeCheck: RpcErrorCode = errorSample.code;
const outcomeCheck: PeerSendOutcome = { peer: peerAddress, status: "sent" };

const copyOnlyContract = defineContract({
  ping: call<[msg: string], string>(),
  fire: notify<[count: number]>(),
});
declare const numberCodec: RpcCodec<RpcEnvelope, number>;
declare const transferTransport: RpcTransport<string, { readonly tag?: string }, ArrayBuffer, true>;

const neutralEndpoint = createRpcEndpoint({
  contract: copyOnlyContract,
  codec: neutralCodec,
  transport: neutralTransport,
  localPeer: peerAddress,
});
const transferEndpoint = createRpcEndpoint({
  contract,
  codec: neutralCodec,
  transport: transferTransport,
  localPeer: peerAddress,
});
const boundNeutralClient = neutralEndpoint.bindPeer(peerAddress);
const boundNeutralCall: Promise<string> = boundNeutralClient.call.ping(["hi"], {
  postOptions: { tag: "t" },
});
const boundTransferClient = transferEndpoint.bindPeer(peerAddress);
const boundTransferCall: Promise<Uint8Array> = boundTransferClient.call.binaryRequired([
  withTransfer(sample, [sample.buffer]),
]);

declare const portLike: MessagePortLike<ArrayBuffer>;
declare const workerTransferPort: WorkerTransferPort;
declare const dynamicProfile: WorkerTransferProfile;
const workerEndpoint = createRpcEndpoint({
  contract,
  codec: createIdentityCodec(),
  transport: createMessagePortTransport({ port: portLike, remotePeer: peerAddress }),
  localPeer: peerAddress,
});
const workerPortsEndpoint = createRpcEndpoint({
  contract,
  codec: createIdentityCodec(),
  transport: createMessagePortTransport({
    port: portLike,
    remotePeer: peerAddress,
    transferProfile: "binary-data-and-ports",
  }),
  localPeer: peerAddress,
});
const workerClient = workerEndpoint.bindPeer(peerAddress);
const workerPortsClient = workerPortsEndpoint.bindPeer(peerAddress);
const checkedTransfer: readonly ArrayBuffer[] = assertReachableTransferables(sample, [sample.buffer]);
const checkedPortTransfer: readonly (ArrayBuffer | WorkerTransferPort)[] =
  assertReachableTransferables([sample, workerTransferPort], [sample.buffer, workerTransferPort], {
    transferProfile: "binary-data-and-ports",
  });

const validDataShape: WorkerTransferData = {
  undef: undefined,
  nil: null,
  flag: true,
  count: 42,
  label: "ok",
  big: 10n,
  buf: sample.buffer,
  view: sample,
  dv: new DataView(sample.buffer),
  nested: [{ inner: new Int32Array(2) }],
};
const validPortDataShape: WorkerTransferData<WorkerTransferPort> = {
  port: workerTransferPort,
  payload: validDataShape,
};

// Custom codec converting non-Worker data (Date/Map) into valid WorkerTransferData:
const domainContract = defineContract({
  convert: call<[when: Date, entries: Map<string, Uint8Array>], Uint8Array>().transfer({
    input: "required",
  }),
});
const convertingCodec: RpcCodec<RpcEnvelope, RpcEnvelope> = {
  encode: (env) => env,
  decode: (wire) => wire as RpcEnvelope,
};
const domainEndpoint = createRpcEndpoint({
  contract: domainContract,
  codec: convertingCodec,
  transport: createMessagePortTransport({ port: portLike, remotePeer: peerAddress }),
  localPeer: peerAddress,
});

void [
  validWrappedArgs,
  validWrappedReturn,
  validOptionalReturn,
  emptyCallNoArgs,
  emptyCallWithOptions,
  optionalArgSeparated,
  optionalArgOmitted,
  restCallSeparated,
  optRequiredCall,
  mixedOptRequiredFirst,
  mixedOptRequiredSecond,
  restRequiredCall,
  restRequiredLaterCall,
  optRestRequiredCall,
  optRestRequiredLaterCall,
  encodedPayload,
  wireError,
  codeCheck,
  outcomeCheck,
  neutralTransport,
  peerClient,
  cancelSignal,
  boundNeutralCall,
  boundTransferCall,
  workerClient,
  workerPortsClient,
  checkedTransfer,
  checkedPortTransfer,
  validDataShape,
  validPortDataShape,
  domainEndpoint,
];

// ---------------------------------------------------------------------------
// Expected compile-time errors
// ---------------------------------------------------------------------------

// @ts-expect-error Neutral types must not depend on DOM AbortSignal.
type NoAmbientAbortSignal = AbortSignal;
// @ts-expect-error Neutral types must not depend on DOM Transferable.
type NoAmbientTransferable = Transferable;
export type {
  CheckCallable,
  CheckMultiNotifiable,
  CheckNotifiable,
  CheckSubsetCallable,
  NoAmbientAbortSignal,
  NoAmbientTransferable,
};

// @ts-expect-error Notification-only method cannot declare result transfer.
notify<[number]>().transfer({ result: "required" });

// @ts-expect-error Picking a non-existent contract method must fail.
pickContract(contract, ["missing"]);

// @ts-expect-error Notification-only method `ping` is absent from `call` proxy.
peerClient.call.ping([1]);

// @ts-expect-error Options must not be passed in the `args` slot of an empty-arg method.
peerClient.call.flush({ timeoutMs: 100 });

// @ts-expect-error Transfer-required argument rejects unwrapped Uint8Array.
peerClient.call.binaryRequired([sample]);

// @ts-expect-error Optional transfer-required method rejects empty or unwrapped arguments.
peerClient.call.optionalTransferRequired([]);

// @ts-expect-error Mixed optional transfer-required method rejects call with no WithTransfer argument.
peerClient.call.mixedOptionalTransferRequired(["label"]);

// @ts-expect-error Rest transfer-required method rejects unwrapped array elements.
peerClient.call.restTransferRequired([sample]);

// @ts-expect-error Rest transfer-required method rejects multi-element arrays when none carries WithTransfer.
peerClient.call.restTransferRequired([sample, sample]);

// @ts-expect-error Optional+rest transfer-required method preserves position types and rejects invalid element type at optional position.
peerClient.call.optRestTransferRequired([sample, withTransfer(sample, [sample.buffer])]);

// @ts-expect-error Optional+rest transfer-required method rejects calls where no element carries WithTransfer.
peerClient.call.optRestTransferRequired(["tag", sample]);

// @ts-expect-error Method whose inputTransfer union includes `"required"` is excluded from `notifyMany`.
const badMultiNotifyKey: MultiNotifiableKeys<typeof contract> = "unionTransferNotify";
void badMultiNotifyKey;

// @ts-expect-error Unknown error code is rejected.
new RpcError("not-a-code", "bad");

// @ts-expect-error Incompatible postOptions type is rejected on `call`.
peerClient.call.encrypt([sample, "k"], { postOptions: { wrongField: true } });

// @ts-expect-error Missing `withTransfer` fails HandlerResult when result transfer is required.
const invalidHandlerReturn: RequiredHandlerRet = sample;
void invalidHandlerReturn;

createRpcEndpoint({
  contract: copyOnlyContract,
  // @ts-expect-error Codec Wire type (`number`) must match transport Wire (`string`).
  codec: numberCodec,
  transport: neutralTransport,
  localPeer: peerAddress,
});

// @ts-expect-error Contract requiring transfer cannot bind to transport with SupportsTransfer=false.
createRpcEndpoint({
  contract,
  codec: neutralCodec,
  transport: neutralTransport,
  localPeer: peerAddress,
});

// @ts-expect-error Generic override on createMessagePortTransport must not enable non-ArrayBuffer resources.
createMessagePortTransport<WorkerTransferPort>({ port: portLike, remotePeer: peerAddress });

createMessagePortTransport({
  port: portLike,
  remotePeer: peerAddress,
  // @ts-expect-error Union-valued profile option requires narrowing.
  transferProfile: dynamicProfile,
});

// @ts-expect-error Default profile rejects WorkerTransferPort in assertReachableTransferables.
assertReachableTransferables([workerTransferPort], [workerTransferPort]);

// @ts-expect-error WorkerTransferData excludes Date.
const badDateData: WorkerTransferData = new Date();
// @ts-expect-error WorkerTransferData excludes Map.
const badMapData: WorkerTransferData = new Map<string, Uint8Array>();
// @ts-expect-error WorkerTransferData excludes Set.
const badSetData: WorkerTransferData = new Set<Uint8Array>();
// @ts-expect-error WorkerTransferData excludes Error.
const badErrorData: WorkerTransferData = new Error("boom");
// @ts-expect-error WorkerTransferData excludes RegExp.
const badRegExpData: WorkerTransferData = /abc/;
// @ts-expect-error WorkerTransferData excludes functions.
const badFnData: WorkerTransferData = () => 1;
// @ts-expect-error WorkerTransferData excludes symbols.
const badSymbolData: WorkerTransferData = Symbol("x");
// @ts-expect-error Default WorkerTransferData (without WorkerTransferPort extra) excludes ports.
const badPortInDefaultData: WorkerTransferData = workerTransferPort;

void [
  badDateData,
  badMapData,
  badSetData,
  badErrorData,
  badRegExpData,
  badFnData,
  badSymbolData,
  badPortInDefaultData,
];
